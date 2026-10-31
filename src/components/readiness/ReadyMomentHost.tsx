import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { fetchMyProfile } from '@/api/profile';
import { ReadyMoment } from '@/components/readiness/ReadyMoment';
import { queryKeys } from '@/lib/queryClient';
import { clearReady, useReadyCelebrationVisible } from '@/state/readyCelebration';

/**
 * Shows the "you're ready" moment once the member has moved off the form they
 * finished, on whichever main screen they are now on.
 */
export function ReadyMomentHost() {
  const visible = useReadyCelebrationVisible();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile, enabled: visible }).data;
  return (
    <ReadyMoment
      visible={visible}
      name={profile?.firstName || profile?.name || ''}
      onStart={() => {
        clearReady();
        void queryClient.invalidateQueries({ queryKey: queryKeys.round });
        router.navigate('/(tabs)/daily');
      }}
      onLater={clearReady}
    />
  );
}
