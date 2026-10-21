/**
 * Small, in-memory timers for profile bio and individual photo visibility.
 * Nothing is persisted on-device; the bounded snapshot is sent only with the
 * member's normal round submission, and the server decides whether to retain it.
 */
export interface MatchingEngagementPhoto {
  storagePath: string;
  seconds: number;
}

export interface MatchingEngagementObservation {
  introductionId: string;
  profileSeconds?: number;
  bioSeconds?: number;
  photos?: MatchingEngagementPhoto[];
}

interface Totals {
  bioMs: number;
  photos: Map<string, number>;
}

export class MatchingEngagementLedger {
  private readonly totals = new Map<string, Totals>();
  private activeBio: { id: string; since: number | null } | null = null;
  private activePhoto: { id: string; path: string; since: number | null } | null = null;
  private paused = false;

  constructor(private readonly now: () => number = () => Date.now()) {}

  bioVisibility(introductionId: string, visible: boolean): void {
    if (this.activeBio?.id === introductionId && visible) return;
    this.bankBio();
    this.activeBio = visible ? { id: introductionId, since: this.paused ? null : this.now() } : null;
  }

  photoVisibility(introductionId: string, storagePath: string | null | undefined, visible: boolean): void {
    const path = storagePath?.trim();
    if (visible && (!path || path.startsWith('http'))) return;
    if (this.activePhoto?.id === introductionId && this.activePhoto.path === path && visible) return;
    this.bankPhoto();
    this.activePhoto = visible && path
      ? { id: introductionId, path, since: this.paused ? null : this.now() }
      : null;
  }

  pause(): void {
    if (this.paused) return;
    this.bankBio();
    this.bankPhoto();
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    const now = this.now();
    if (this.activeBio) this.activeBio.since = now;
    if (this.activePhoto) this.activePhoto.since = now;
  }

  /** Snapshot without stopping visible timers, so a failed submit can retry. */
  snapshot(): MatchingEngagementObservation[] {
    this.bankBio();
    this.bankPhoto();
    const result = [...this.totals.entries()].map(([introductionId, total]) => {
      const bioSeconds = toBoundedFiveSecondUnits(total.bioMs);
      const photos = [...total.photos.entries()]
        .map(([storagePath, milliseconds]) => ({
          storagePath,
          seconds: toBoundedFiveSecondUnits(milliseconds),
        }))
        .filter((photo) => photo.seconds > 0)
        .slice(0, 6);
      return {
        introductionId,
        ...(bioSeconds > 0 ? { bioSeconds } : {}),
        ...(photos.length ? { photos } : {}),
      };
    }).filter((item) => item.bioSeconds !== undefined || item.photos !== undefined);
    this.restartVisibleTimers();
    return result;
  }

  clear(): void {
    this.totals.clear();
    this.activeBio = null;
    this.activePhoto = null;
    this.paused = false;
  }

  private totalsFor(id: string): Totals {
    let totals = this.totals.get(id);
    if (!totals) {
      totals = { bioMs: 0, photos: new Map() };
      this.totals.set(id, totals);
    }
    return totals;
  }

  private bankBio(): void {
    if (!this.activeBio || this.activeBio.since === null) return;
    const elapsed = Math.max(0, this.now() - this.activeBio.since);
    this.totalsFor(this.activeBio.id).bioMs += elapsed;
    this.activeBio.since = null;
  }

  private bankPhoto(): void {
    if (!this.activePhoto || this.activePhoto.since === null) return;
    const elapsed = Math.max(0, this.now() - this.activePhoto.since);
    const photos = this.totalsFor(this.activePhoto.id).photos;
    photos.set(this.activePhoto.path, (photos.get(this.activePhoto.path) ?? 0) + elapsed);
    this.activePhoto.since = null;
  }

  private restartVisibleTimers(): void {
    if (this.paused) return;
    const now = this.now();
    if (this.activeBio) this.activeBio.since = now;
    if (this.activePhoto) this.activePhoto.since = now;
  }
}

function toBoundedFiveSecondUnits(milliseconds: number): number {
  return Math.min(120, Math.round(milliseconds / 5000) * 5);
}
