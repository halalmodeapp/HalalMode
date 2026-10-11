import type { Condition, Effects, Next, Target } from '../types.ts';

export interface StoryContext {
  vars: Record<string, number>;
  flags: readonly string[];
}

export function holds(condition: Condition | undefined, context: StoryContext): boolean {
  if (!condition) return true;
  if ('all' in condition) return condition.all.every((part) => holds(part, context));
  if ('any' in condition) return condition.any.some((part) => holds(part, context));
  if ('flag' in condition) return context.flags.includes(condition.flag);
  if ('notFlag' in condition) return !context.flags.includes(condition.notFlag);
  const value = context.vars[condition.var] ?? 0;
  if (condition.gte !== undefined && value < condition.gte) return false;
  if (condition.lte !== undefined && value > condition.lte) return false;
  return true;
}

export function applyEffects<T extends StoryContext>(context: T, effects: Effects | undefined): T {
  if (!effects) return context;
  const vars = { ...context.vars };
  for (const [name, delta] of Object.entries(effects.vars ?? {})) {
    vars[name] = (vars[name] ?? 0) + delta;
  }
  const flags = [...context.flags];
  for (const flag of effects.flags ?? []) {
    if (!flags.includes(flag)) flags.push(flag);
  }
  return { ...context, vars, flags };
}

/** The first route whose condition holds. A route list must end unconditionally. */
export function resolveNext(next: Next, context: StoryContext): Target {
  if (typeof next === 'string') return next;
  for (const route of next.routes) {
    if (holds(route.when, context)) return route.to;
  }
  const last = next.routes[next.routes.length - 1];
  if (!last) throw new Error('A route list has no routes.');
  return last.to;
}

/** Every target a `Next` could lead to, ignoring conditions. For validation. */
export function possibleTargets(next: Next): Target[] {
  return typeof next === 'string' ? [next] : next.routes.map((route) => route.to);
}
