import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { NoticeDialog } from '@/components/notices/NoticeDialog';
import { ReadyMomentHost } from '@/components/readiness/ReadyMomentHost';
import { guardNavigation } from '@/state/unsavedChanges';

export default function TabsLayout() {
  return (
    <>
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      screenListeners={({ route }) => ({
        // Leaving You with edits waiting sends them first; nothing is asked.
        tabPress: () => {
          if (route.name !== 'you') guardNavigation(() => undefined);
        },
      })}
    >
      <Tabs.Screen
        name="daily"
        options={{ title: 'Daily' }}
      />

      <Tabs.Screen
        name="connections"
        options={{ title: 'Connections' }}
      />

      <Tabs.Screen
        name="you"
        options={{ title: 'You' }}
      />
    </Tabs>
    {/* What came of a report, or a removed photo. */}
    <NoticeDialog />
    {/* The "you're ready" moment, shown once the member has moved off the form they finished. */}
    <ReadyMomentHost />
    </>
  );
}