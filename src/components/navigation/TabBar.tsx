// Expo Router 57 vendors the matching navigation types.
// Importing this from a separately installed navigation package can create
// incompatible duplicate types.
import { useBreakpoint } from '@/theme/breakpoints';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCardsAttention } from '@/halalCards/hooks';
import { useI18n } from '@/i18n';
import { font } from '@/theme/tokens';

const BAR_HEIGHT = 78;

const PILL_HEIGHT = 60;
const PILL_RADIUS = PILL_HEIGHT / 2;
const PILL_TOP = 8;

/** The chosen tab's pill: plain black. Text on it is white; off it, grey. */
const PILL_COLOR = '#0A0A0A';
const TEXT_OFF = '#929292';
const TEXT_ON = '#FFFFFF';

type TabRouteName = 'daily' | 'connections' | 'you';

const PILL_WIDTHS: Record<TabRouteName, number> = {
  daily: 116,
  connections: 176,
  you: 108,
};

/** Width used for any route without a measured pill of its own. */
const DEFAULT_PILL_WIDTH = 130;

function isTabRouteName(
  name: string | undefined,
): name is TabRouteName {
  return (
    name === 'daily' ||
    name === 'connections' ||
    name === 'you'
  );
}

const MARKS: Record<string, string> = {
  daily: '✦',
  connections: '♥',
  you: '✿',
};

const POSITION_SPRING = {
  damping: 14.5,
  stiffness: 175,
  mass: 0.82,
  overshootClamping: false,
  restDisplacementThreshold: 0.08,
  restSpeedThreshold: 0.08,
};

const WIDTH_SPRING = {
  damping: 8.8,
  stiffness: 165,
  mass: 0.82,
  overshootClamping: false,
  restDisplacementThreshold: 0.06,
  restSpeedThreshold: 0.06,
};

const PRESS_RETURN_SPRING = {
  damping: 8.5,
  stiffness: 255,
  mass: 0.56,
  overshootClamping: false,
  restDisplacementThreshold: 0.02,
  restSpeedThreshold: 0.02,
};

const TITLE_ENTRY_SPRING = {
  damping: 8,
  stiffness: 195,
  mass: 0.66,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const TITLE_RETURN_SPRING = {
  damping: 15,
  stiffness: 215,
  mass: 0.68,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const MARK_ENTRY_SPRING = {
  damping: 7,
  stiffness: 205,
  mass: 0.62,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const MARK_RETURN_SPRING = {
  damping: 15,
  stiffness: 220,
  mass: 0.66,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

interface ElasticTitleProps {
  focused: boolean;
  label: string;
}

function ElasticTitle({
  focused,
  label,
}: ElasticTitleProps) {
  const scale = useSharedValue(focused ? 1.13 : 1);
  const translateY = useSharedValue(focused ? -0.5 : 0);
  const opacity = useSharedValue(focused ? 1 : 0.6);
  // 0 = grey, 1 = white: it turns white as the black pill arrives under it.
  const tone = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(translateY);
    cancelAnimation(opacity);
    cancelAnimation(tone);

    if (focused) {
      tone.value = withDelay(40, withTiming(1, { duration: 200 }));
      scale.value = withDelay(
        52,
        withSequence(
          withTiming(0.94, {
            duration: 50,
          }),
          withSpring(
            1.13,
            TITLE_ENTRY_SPRING,
          ),
        ),
      );

      translateY.value = withDelay(
        52,
        withSpring(
          -0.5,
          TITLE_ENTRY_SPRING,
        ),
      );

      opacity.value = withDelay(
        30,
        withTiming(1, {
          duration: 150,
        }),
      );

      return;
    }

    tone.value = withTiming(0, { duration: 160 });

    scale.value = withSpring(
      1,
      TITLE_RETURN_SPRING,
    );

    translateY.value = withSpring(
      0,
      TITLE_RETURN_SPRING,
    );

    opacity.value = withTiming(0.6, {
      duration: 140,
    });
  }, [
    focused,
    opacity,
    scale,
    tone,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    color: interpolateColor(tone.value, [0, 1], [TEXT_OFF, TEXT_ON]),
    transform: [
      {
        translateY: translateY.value,
      },
      {
        scale: scale.value,
      },
    ],
  }));

  return (
    <Animated.Text
      numberOfLines={1}
      style={[
        styles.label,
        animatedStyle,
      ]}
    >
      {label}
    </Animated.Text>
  );
}

interface ElasticMarkProps {
  focused: boolean;
  mark: string;
}

function ElasticMark({
  focused,
  mark,
}: ElasticMarkProps) {
  const tone = useSharedValue(focused ? 1 : 0);
  const scale = useSharedValue(focused ? 1.22 : 1);
  const translateY = useSharedValue(focused ? -0.5 : 0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(focused ? 1 : 0.64);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(translateY);
    cancelAnimation(rotation);
    cancelAnimation(opacity);
    cancelAnimation(tone);

    if (focused) {
      tone.value = withDelay(62, withTiming(1, { duration: 200 }));
      /**
       * The mark animates 34ms after the title.
       */
      scale.value = withDelay(
        86,
        withSequence(
          withTiming(0.88, {
            duration: 44,
          }),
          withSpring(
            1.22,
            MARK_ENTRY_SPRING,
          ),
        ),
      );

      translateY.value = withDelay(
        86,
        withSpring(
          -0.5,
          MARK_ENTRY_SPRING,
        ),
      );

      rotation.value = withDelay(
        86,
        withSequence(
          withTiming(-5, {
            duration: 44,
          }),
          withSpring(
            0,
            MARK_ENTRY_SPRING,
          ),
        ),
      );

      opacity.value = withDelay(
        62,
        withTiming(1, {
          duration: 135,
        }),
      );

      return;
    }

    tone.value = withTiming(0, { duration: 160 });

    scale.value = withSpring(
      1,
      MARK_RETURN_SPRING,
    );

    translateY.value = withSpring(
      0,
      MARK_RETURN_SPRING,
    );

    rotation.value = withSpring(
      0,
      MARK_RETURN_SPRING,
    );

    opacity.value = withTiming(0.64, {
      duration: 140,
    });
  }, [
    focused,
    opacity,
    rotation,
    scale,
    tone,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    color: interpolateColor(tone.value, [0, 1], [TEXT_OFF, TEXT_ON]),
    transform: [
      {
        translateY: translateY.value,
      },
      {
        rotate: `${rotation.value}deg`,
      },
      {
        scale: scale.value,
      },
    ],
  }));

  return (
    <Animated.Text
      style={[
        styles.mark,
        animatedStyle,
      ]}
    >
      {mark}
    </Animated.Text>
  );
}

export function TabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { t, isRTL } = useI18n();
  const attention = useCardsAttention().data ?? {};
  const cardsWaiting = Object.values(attention).reduce((sum, count) => sum + count, 0);
  const insets = useSafeAreaInsets();
  const island = useBreakpoint() !== 'phone';

  const [layoutWidth, setLayoutWidth] = useState(0);
  const barArea = useRef<View | null>(null);

  // On the web, onLayout can arrive late or not at all, and the pill then sits
  // at a stale position, slid off to the left of the tab it marks. Measuring
  // the element directly, and watching it, keeps the pill under its tab.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof ResizeObserver === 'undefined') return;
    const node = barArea.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;
    const read = () => {
      const measured = node.getBoundingClientRect().width;
      if (measured > 0) setLayoutWidth((current) => (current === measured ? current : measured));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pillCenterX = useSharedValue(0);
  const pillWidth = useSharedValue(
    PILL_WIDTHS.daily,
  );

  const pressScaleX = useSharedValue(1);
  const pressScaleY = useSharedValue(1);
  const pressTranslateY = useSharedValue(0);

  const hasInitialPosition = useRef(false);

  const routes = state.routes;
  const routeCount = routes.length || 1;

  const labels = useMemo(
    () =>
      routes.map((route) =>
        tabLabel(route.name, t),
      ),
    [routes, t],
  );

  useEffect(() => {
    if (!layoutWidth) {
      return;
    }

    const slotWidth =
      layoutWidth / routeCount;

    const activeRouteName =
      routes[state.index]?.name;

    const requestedWidth =
      isTabRouteName(activeRouteName)
        ? PILL_WIDTHS[activeRouteName]
        : DEFAULT_PILL_WIDTH;

    const maximumWidth = Math.max(
      112,
      layoutWidth * 0.54,
    );

    const nextWidth = Math.min(
      requestedWidth,
      maximumWidth,
    );

    const visualIndex = isRTL
      ? routeCount - 1 - state.index
      : state.index;

    const nextCenterX =
      visualIndex * slotWidth +
      slotWidth / 2;

    if (!hasInitialPosition.current) {
      pillCenterX.value = nextCenterX;
      pillWidth.value = nextWidth;
      hasInitialPosition.current = true;
      return;
    }

    pillCenterX.value = withSpring(
      nextCenterX,
      POSITION_SPRING,
    );

    pillWidth.value = withSpring(
      nextWidth,
      WIDTH_SPRING,
    );
  }, [
    isRTL,
    layoutWidth,
    pillCenterX,
    pillWidth,
    routeCount,
    routes,
    state.index,
  ]);

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const currentWidth = pillWidth.value;

    return {
      width: currentWidth,
      transform: [
        {
          translateX:
            pillCenterX.value -
            currentWidth / 2,
        },
        {
          translateY:
            pressTranslateY.value,
        },
        {
          scaleX:
            pressScaleX.value,
        },
        {
          scaleY:
            pressScaleY.value,
        },
      ],
    };
  });

  const handlePressIn = () => {
    cancelAnimation(pressScaleX);
    cancelAnimation(pressScaleY);
    cancelAnimation(pressTranslateY);

    /**
     * Pronounced horizontal stretch and vertical squeeze.
     */
    pressScaleX.value = withTiming(
      1.105,
      {
        duration: 90,
      },
    );

    pressScaleY.value = withTiming(
      0.82,
      {
        duration: 90,
      },
    );

    pressTranslateY.value = withTiming(
      2.4,
      {
        duration: 90,
      },
    );
  };

  const handlePressOut = () => {
    cancelAnimation(pressScaleX);
    cancelAnimation(pressScaleY);
    cancelAnimation(pressTranslateY);

    pressScaleX.value = withSequence(
      withTiming(0.955, {
        duration: 72,
      }),
      withSpring(
        1,
        PRESS_RETURN_SPRING,
      ),
    );

    pressScaleY.value = withSequence(
      withTiming(1.09, {
        duration: 72,
      }),
      withSpring(
        1,
        PRESS_RETURN_SPRING,
      ),
    );

    pressTranslateY.value = withSpring(
      0,
      PRESS_RETURN_SPRING,
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(
            insets.bottom - 4,
            4,
          ),
        },
      ]}
    >
      <View
        ref={barArea}
        style={[
          styles.barArea,
          island && styles.island,
          isRTL && styles.rowReverse,
        ]}
        onLayout={(event) => {
          setLayoutWidth(
            event.nativeEvent.layout.width,
          );
        }}
      >
        {/* The chosen tab sits on a plain black pill that slides, stretches and squeezes between tabs. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pillOuter,
            pillAnimatedStyle,
          ]}
        />

        <View
          style={[
            styles.tabsRow,
            isRTL && styles.rowReverse,
          ]}
        >
          {routes.map(
            (route, routeIndex) => {
              const focused =
                state.index === routeIndex;

              const label =
                labels[routeIndex] ??
                tabLabel(route.name, t);

              return (
                <Pressable
                  testID={`tab-${route.name}`}
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: focused,
                  }}
                  accessibilityLabel={label}
                  hitSlop={{
                    top: 9,
                    bottom: 9,
                    left: 7,
                    right: 7,
                  }}
                  style={styles.tabButton}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onPress={() => {
                    const event =
                      navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      });

                    if (
                      event.defaultPrevented
                    ) {
                      return;
                    }

                    void Haptics.selectionAsync();

                    if (!focused) {
                      navigation.navigate(
                        route.name,
                      );
                    }
                  }}
                  onLongPress={() => {
                    navigation.emit({
                      type: 'tabLongPress',
                      target: route.key,
                    });
                  }}
                >
                  <View
                    style={[
                      styles.tabContent,
                      isRTL &&
                        styles.rowReverse,
                    ]}
                  >
                    <ElasticMark
                      focused={focused}
                      mark={
                        MARKS[route.name] ??
                        '•'
                      }
                    />

                    <ElasticTitle
                      focused={focused}
                      label={label}
                    />
                    {route.name === 'connections' && cardsWaiting > 0 ? (
                      <View
                        style={styles.cardsDot}
                        accessibilityLabel={t('halalCards.badgeA11y', { count: cardsWaiting })}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            },
          )}
        </View>
      </View>
    </View>
  );
}

function tabLabel(
  name: string,
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (name === 'daily') {
    return t('nav.daily');
  }

  if (name === 'connections') {
    return t('nav.connections');
  }

  if (name === 'you') {
    return t('nav.you');
  }

  return name;
}

const styles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },

  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },

  // Wider than a phone: the bar floats as a centred island instead of
  // stretching its three tabs across the whole window.
  island: {
    width: 420,
    alignSelf: 'center',
    marginHorizontal: 0,
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(252,252,251,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(10,10,10,0.08)',
    boxShadow: '0 14px 34px -14px rgba(42,48,56,0.28)',
  },

  barArea: {
    height: BAR_HEIGHT,
    marginHorizontal: 20,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },

  pillOuter: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: PILL_COLOR,
    boxShadow: '0 8px 18px -8px rgba(10,10,10,0.45)',
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  tabsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',

    backgroundColor: 'transparent',
  },

  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },

  mark: {
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 17,
    includeFontPadding: false,
  },

  cardsDot: { position: 'absolute', top: -2, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C5A054' },
  label: {
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: 0.18,
    color: TEXT_OFF,
    includeFontPadding: false,
  },
});