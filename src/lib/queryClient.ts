import { QueryClient } from '@tanstack/react-query';

/**
 * Stale screen data refreshes on return to the app. Private media has its own
 * account-scoped cache; renewing a link never refetches a profile or round.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  session: ['session'] as const,
  profile: (id: string) => ['profile', id] as const,
  profileReadiness: ['profile-readiness'] as const,
  highLatitudeFajrSettings: ['high-latitude-fajr-settings'] as const,
  legalConsent: ['legal-consent'] as const,
  preferences: ['preferences'] as const,
  round: ['round'] as const,
  connections: ['connections'] as const,
  connection: (id: string) => ['connection', id] as const,
  savedAnswers: ['saved-answers'] as const,
  messages: (connectionId: string) => ['messages', connectionId] as const,
  notices: ['notices'] as const,
  selfie: ['selfie'] as const,
  maritalSettings: ['marital-settings'] as const,
  cardsAccess: (connectionId: string) => ['halal-cards', 'access', connectionId] as const,
  cardsSessions: (connectionId: string) => ['halal-cards', 'sessions', connectionId] as const,
  cardsSession: (sessionId: string) => ['halal-cards', 'session', sessionId] as const,
  cardsGuide: (connectionId: string) => ['halal-cards', 'guide', connectionId] as const,
  cardsAttention: ['halal-cards', 'attention'] as const,
  referralProgress: ['referral-progress'] as const,
};
