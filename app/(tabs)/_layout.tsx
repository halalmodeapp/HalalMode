import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { NoticeDialog } from '@/components/notices/NoticeDialog';
import { guardNavigation, hasUnsavedChanges } from '@/state/unsavedChanges';

export default function TabsLayout() {
  return (
    <>
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      screenListeners={({ navigation, route }) => ({
        // Leaving You with unsaved changes asks first; the question is on the You screen.
        tabPress: (event) => {
          if (route.name === 'you' || !hasUnsavedChanges()) return;
          event.preventDefault();
          guardNavigation(() => navigation.navigate(route.name));
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
    </>
  );
}