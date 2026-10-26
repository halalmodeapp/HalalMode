import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { PHOTO_JPEG_QUALITY, photoResizeTarget } from '@/lib/photoPolicy';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** none: no selfie yet. pending and review: with Luna or a person. rejected: retake it. */
export type SelfieStatus = 'none' | 'pending' | 'verified' | 'review' | 'rejected';

const SELFIE_BUCKET = 'verification-selfies';
const SELFIE_LIMIT_BYTES = 10 * 1024 * 1024;
const STATUSES: readonly SelfieStatus[] = ['none', 'pending', 'verified', 'review', 'rejected'];

export async function fetchMySelfieStatus(): Promise<SelfieStatus> {
  if (USE_MOCKS) return 'verified';
  const { data, error } = await requireSupabase().rpc('my_selfie_status');
  if (error) throw error;
  return (STATUSES as readonly string[]).includes(String(data)) ? (data as SelfieStatus) : 'none';
}

/**
 * Re-encodes a camera selfie as a JPEG and stores it in the private
 * verification bucket. It cannot be read back by anyone but the checker, and
 * nothing points at it until submitSelfie is called.
 */
export async function uploadSelfie(uri: string): Promise<string> {
  if (USE_MOCKS) return uri;
  const client = requireSupabase();
  const body = await readJpeg(uri);
  const { data: path, error: pathError } = await client.rpc('create_selfie_path');
  if (pathError) throw pathError;
  if (typeof path !== 'string' || !path) throw new Error('The verification service did not return an upload path.');
  const { error } = await client.storage
    .from(SELFIE_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false, cacheControl: '60' });
  if (error) throw error;
  return path;
}

/** Sends an uploaded selfie to be checked. The profile must already exist. */
export async function submitSelfie(path: string): Promise<SelfieStatus> {
  if (USE_MOCKS) return 'verified';
  const { error } = await requireSupabase().rpc('submit_selfie', { p_path: path });
  if (error) throw error;
  return 'pending';
}

async function readJpeg(uri: string): Promise<ArrayBuffer> {
  let jpeg: string;
  try {
    const source = await ImageManipulator.manipulate(uri).renderAsync();
    const target = photoResizeTarget(source.width, source.height);
    const rendered = target
      ? await ImageManipulator.manipulate(source).resize(target).renderAsync()
      : source;
    jpeg = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_JPEG_QUALITY })).uri;
  } catch {
    // Fail closed: the re-encode also strips where the photo was taken.
    throw new Error('This selfie could not be processed. Please take another.');
  }
  const buffer = Platform.OS === 'web'
    ? await (await fetch(jpeg)).arrayBuffer()
    : await new File(jpeg).arrayBuffer();
  if (buffer.byteLength <= 0 || buffer.byteLength > SELFIE_LIMIT_BYTES) {
    throw new Error('This selfie could not be processed. Please take another.');
  }
  return buffer;
}
