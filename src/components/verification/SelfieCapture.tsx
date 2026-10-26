import { useState } from 'react';
import { Alert, Image, Linking, Platform, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { uploadSelfie } from '@/api/selfie';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { alpha, color, radius, space } from '@/theme/tokens';

interface SelfieCaptureProps {
  /** Called with the private storage path once the selfie is uploaded. */
  onUploaded: (path: string) => void;
  /** The selfie taken so far this session, shown back to the member. */
  taken?: boolean;
}

/**
 * Takes a selfie with the front camera and uploads it for verification.
 *
 * It opens the camera and never the photo library, so what is checked was
 * taken a moment ago and the picture cannot be one borrowed from somebody
 * else. The preview is the local file; nothing is ever shown back from the
 * server. Luna checks it after sign-up.
 */
export function SelfieCapture({ onUploaded, taken = false }: SelfieCaptureProps) {
  const { t } = useI18n();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(t('selfie.denied'));
      if (!permission.canAskAgain && Platform.OS !== 'web') {
        Alert.alert(t('selfie.deniedTitle'), t('selfie.denied'), [
          { text: t('settings.notNow'), style: 'cancel' },
          { text: t('common.openSettings'), onPress: () => { void Linking.openSettings().catch(() => {}); } },
        ]);
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.9,
    }).catch(() => null);
    const asset = result && !result.canceled ? result.assets[0] : null;
    if (!asset) return;
    setBusy(true);
    try {
      const path = await uploadSelfie(asset.uri);
      setUri(asset.uri);
      onUploaded(path);
    } catch {
      setError(t('selfie.failed'));
    } finally {
      setBusy(false);
    }
  };

  const done = taken && uri !== null;
  return (
    <View style={styles.wrap}>
      {uri ? <Image source={{ uri }} style={styles.preview} accessibilityIgnoresInvertColors /> : null}
      {done ? <Text variant="bodySmall" style={styles.ready}>{t('selfie.ready')}</Text> : null}
      <Button
        label={uri ? t('selfie.retake') : t('selfie.take')}
        variant={uri ? 'secondary' : 'primary'}
        loading={busy}
        onPress={() => void capture()}
      />
      {error ? (
        <Text variant="bodySmall" style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, alignItems: 'stretch', marginTop: 22 },
  preview: {
    width: 180,
    height: 240,
    alignSelf: 'center',
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.sand,
  },
  ready: { textAlign: 'center', color: color.inkSoft },
  error: { color: '#A33A3A' },
});
