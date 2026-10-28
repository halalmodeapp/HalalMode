import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

import { useScreenActive } from '@/hooks/useScreenActive';
import { registerScroller, visibleCenter, type FocusedInput } from '@/lib/keyboardCentering';

/**
 * Keeps the native end-of-content rubber-band available even when a screen's
 * content is shorter than its viewport. iOS uses the bounce props; Android
 * uses overScrollMode.
 *
 * It also centres a tapped text box between the top of the screen and the
 * keyboard (see lib/keyboardCentering), and leaves room under the content while
 * the keyboard is up so the last fields can be centred too.
 */
export const StretchScrollView = forwardRef<ScrollView, ScrollViewProps>(function StretchScrollView(
  { children, onScroll, contentContainerStyle, ...props },
  ref,
) {
  const inner = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => inner.current as ScrollView);
  const offset = useRef(0);
  const screenActive = useScreenActive();
  const activeRef = useRef(screenActive);
  activeRef.current = screenActive;
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboard(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const center = useCallback((input: FocusedInput) => {
    const view = inner.current;
    if (!view) return;
    input.measureInWindow((_x, y, _width, height) => {
      (view as unknown as FocusedInput).measureInWindow((_sx: number, sy: number, _sw: number, sh: number) => {
        const windowHeight = Dimensions.get('window').height;
        // Only a field inside this scroll view's own frame is its business.
        if (height <= 0 || y + height < sy || y > sy + sh) return;
        const delta = y + height / 2 - visibleCenter(sy, sh, windowHeight);
        if (Math.abs(delta) < 10) return;
        view.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
      });
    });
  }, []);

  useEffect(() => registerScroller({ active: () => activeRef.current, center }), [center]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  };

  return (
    <ScrollView
      ref={inner}
      bounces
      alwaysBounceVertical
      overScrollMode="always"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      contentContainerStyle={[contentContainerStyle, keyboard > 0 && { paddingBottom: keyboard }]}
      {...props}
    >
      {children}
    </ScrollView>
  );
});
