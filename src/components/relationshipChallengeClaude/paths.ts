import type { RcScenarioId } from '@/halalCards/relationshipChallengeClaude/types';

/** Relationship Challenge Claude routes, inside the Halal Cards stack for one connection. */
export const rcClaudePaths = {
  lobby: (connectionId: string) => `/halal-cards/${connectionId}/relationship-challenge-claude`,
  play: (connectionId: string, sessionId: string) => `/halal-cards/${connectionId}/relationship-challenge-claude/play/${sessionId}`,
  preview: (connectionId: string, scenarioId: RcScenarioId) =>
    `/halal-cards/${connectionId}/relationship-challenge-claude/preview/${scenarioId}`,
};
