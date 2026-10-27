import type { TranslationKey } from '@/i18n/catalog';
import type { Gender, MaritalStatus } from '@/types';

export const MARITAL_STATUSES: readonly MaritalStatus[] = ['never_married', 'divorced', 'widowed', 'married'];

/** What a member can declare about themselves. Only a man can be currently married. */
export function declarableStatuses(gender: Gender | null | undefined): MaritalStatus[] {
  return gender === 'male' ? [...MARITAL_STATUSES] : MARITAL_STATUSES.filter((status) => status !== 'married');
}

/** What a member can say they are open to. Only a woman can be open to a married man. */
export function acceptableStatuses(gender: Gender | null | undefined): MaritalStatus[] {
  return gender === 'female' ? [...MARITAL_STATUSES] : MARITAL_STATUSES.filter((status) => status !== 'married');
}

/** The choices a new member starts with: everything except being open to a married man. */
export const DEFAULT_ACCEPTED: readonly MaritalStatus[] = ['never_married', 'divorced', 'widowed'];

export function isDeclarable(gender: Gender | null | undefined, status: string | null | undefined): status is MaritalStatus {
  return declarableStatuses(gender).includes(status as MaritalStatus);
}

export const MARITAL_STATUS_KEYS: Record<MaritalStatus, TranslationKey> = {
  never_married: 'marital.never_married',
  divorced: 'marital.divorced',
  widowed: 'marital.widowed',
  married: 'marital.married',
};

/** The preference wording: a woman's last option is about a man who is already married. */
export const ACCEPTED_KEYS: Record<MaritalStatus, TranslationKey> = {
  never_married: 'marital.never_married',
  divorced: 'marital.divorced',
  widowed: 'marital.widowed',
  married: 'marital.openToMarried',
};

/** Soft, equal tints with dark text. Never red, and no status reads as a warning. */
export const MARITAL_TONES: Record<MaritalStatus, { background: string; text: string }> = {
  never_married: { background: 'rgba(47,93,74,0.12)', text: '#2F5D4A' },
  divorced: { background: 'rgba(184,145,79,0.16)', text: '#7A5B1E' },
  widowed: { background: 'rgba(93,120,149,0.16)', text: '#3F5873' },
  married: { background: 'rgba(176,112,96,0.16)', text: '#7A4034' },
};

interface Side {
  status: MaritalStatus | null | undefined;
  accepted: readonly MaritalStatus[];
}

/**
 * Whether two members may be introduced, by marital status alone. The matcher
 * applies the same rule in SQL (matching_shortlist_batch_edges): each person's
 * status must be one the other is open to, and someone who has not declared a
 * status is never introduced.
 */
export function maritalStatusesAllow(a: Side, b: Side): boolean {
  if (!a.status || !b.status) return false;
  return b.accepted.includes(a.status) && a.accepted.includes(b.status);
}
