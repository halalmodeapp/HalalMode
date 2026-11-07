/**
 * A league worker: takes tables from the database, plays them and commits them,
 * until there is nothing left or its time is up. Any number can run at once, and
 * any of them can die at any point: a lease runs out and another takes the table.
 *
 * There is no state here. Everything about the day lives in the database, so the
 * next worker simply asks what to do next.
 */
import { playOneWay, playTable, type LeagueSettings, type LeagueTable } from '../../../src/matching/league.ts';
import { dawnSearchStart, nextFajrWindow } from '../../../src/lib/prayerTimes.ts';

interface Rpc {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

interface PrepareJob {
  kind: 'prepare';
  job: Record<string, unknown>;
  /** When this day's cycle began. Dawn is worked out from this, so a retry gets the same answer. */
  after: string;
  /** last_dawn: when this member's latest set opened, so the next one follows it and never repeats it. */
  members: { user_id: string; latitude: number; longitude: number; high_latitude_fajr_method: string; last_dawn?: string | null }[];
}

interface TableJob {
  kind: 'table';
  job: Record<string, unknown>;
  table: LeagueTable;
  settings: LeagueSettings;
}

type NextJob = PrepareJob | TableJob | { kind: 'off' | 'wait' | 'done' | 'again' };

export type DawnWindow = (member: PrepareJob['members'][number], after: Date) => { opensAt: Date; expiresAt: Date } | null;

export const memberDawn: DawnWindow = (member, after) =>
  nextFajrWindow(
    member.latitude,
    member.longitude,
    after,
    member.high_latitude_fajr_method === 'reference_latitude_45' ? 'reference_latitude_45' : 'one_seventh',
  );

/** A commit is never larger than this, so no single statement holds on for long. */
const COMMIT_SIZE = 200;

async function call<T>(client: Rpc, name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as T;
}

export interface WorkerResult {
  /** Why the worker stopped. `more` means work remains and someone should carry on. */
  stopped: 'off' | 'done' | 'wait' | 'more';
  jobs: number;
  failedJobs: number;
  edges: number;
  /** Introductions the tables proposed. Far more than `edges` means the rules here and in SQL disagree. */
  proposed: number;
  /** Time spent computing rather than waiting on the database. */
  computeMs: number;
  worstTableMs: number;
  errors: string[];
}

/**
 * Works until the budgets run out. `computeBudgetMs` guards the Edge CPU limit and `wallBudgetMs` the
 * request limit. Work stops between tables, so it leaves room for one as long as the longest so far.
 */
export async function runLeagueWorker(
  client: Rpc,
  options: { computeBudgetMs: number; wallBudgetMs: number; dawn?: DawnWindow },
): Promise<WorkerResult> {
  const dawn = options.dawn ?? memberDawn;
  const started = performance.now();
  const result: WorkerResult = { stopped: 'more', jobs: 0, failedJobs: 0, edges: 0, proposed: 0, computeMs: 0, worstTableMs: 0, errors: [] };

  while (result.computeMs + result.worstTableMs < options.computeBudgetMs && performance.now() - started < options.wallBudgetMs) {
    const next = await call<NextJob>(client, 'league_next_job_service');
    // The day moved on, or someone else is moving it, and there may be work as soon as it has.
    if (next.kind === 'again') {
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }
    if (next.kind === 'off' || next.kind === 'done' || next.kind === 'wait') {
      result.stopped = next.kind;
      return result;
    }
    try {
      if (next.kind === 'prepare') {
        const computing = performance.now();
        const windows = [];
        for (const member of next.members) {
          const window = dawn(member, dawnSearchStart(new Date(next.after), member.last_dawn));
          if (window) windows.push({ user_id: member.user_id, opens_at: window.opensAt.toISOString(), expires_at: window.expiresAt.toISOString() });
        }
        result.computeMs += performance.now() - computing;
        await call(client, 'league_commit_rounds_service', { p_job: next.job, p_windows: windows });
      } else {
        const computing = performance.now();
        const proposals = (next.table.oneWay ? playOneWay : playTable)(next.table, next.settings);
        const spent = performance.now() - computing;
        result.computeMs += spent;
        result.worstTableMs = Math.max(result.worstTableMs, spent);
        result.proposed += proposals.length;
        for (let at = 0; at < proposals.length; at += COMMIT_SIZE) {
          result.edges += await call<number>(client, 'league_commit_edges_service', {
            p_job: next.job,
            p_edges: proposals.slice(at, at + COMMIT_SIZE),
          });
        }
      }
      await call(client, 'league_finish_job_service', { p_job: next.job });
      result.jobs += 1;
    } catch (error) {
      const message = String(error);
      result.failedJobs += 1;
      if (result.errors.length < 5) result.errors.push(message);
      // Hands the table back at once. If this call fails too, the lease simply runs out.
      await client.rpc('league_finish_job_service', { p_job: next.job, p_error: message.slice(0, 500) });
    }
  }
  return result;
}
