import AsyncStorage from '@react-native-async-storage/async-storage';

/** The fanned reveal plays once per set; this remembers which sets it has. */
function revealKey(roundId: string): string {
  return `halal-mode:reveal-seen:${roundId}`;
}

export async function hasSeenReveal(roundId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(revealKey(roundId))) === '1';
  } catch {
    // Better to skip the flourish than to replay it on every visit.
    return true;
  }
}

export async function markRevealSeen(roundId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(revealKey(roundId), '1');
  } catch {
    // Worst case it plays once more.
  }
}
