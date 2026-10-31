import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { PhotoCropSheet } from '@/components/you/PhotoCropSheet';
import * as Location from 'expo-location';
import { useRegisterUnsaved } from '@/state/unsavedChanges';
import { useAutosave, type SaveResult } from '@/hooks/useAutosave';
import { isNetworkError } from '@/lib/autosave';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaritalStatusField } from '@/components/you/MaritalSections';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';
import { z } from 'zod';
import { fetchMyProfileReadiness, setMyLifestyle, setMyProfileDetails, setMySect, updateMyLocation, updateMyPreferences, updateMyProfile } from '@/api/profile';
import { HAS_CHILDREN_PROFILE, asGroups, dressOptions } from '@/data/matchingOptions';
import { ETHNICITY_MAX, ETHNICITY_PROFILE_GROUPS, findEthnicity, withUnstatedAlone } from '@/data/ethnicities';
import { HERITAGE_MAX, heritageGroups, heritageName } from '@/data/heritage';
import { DIETS, DIET_KEYS, GREW_UP_MAX, toggleDiet } from '@/data/diet';
import { buildGroups, buildLabel } from '@/components/you/PrivateTab';
import { BUILD_OPTIONS, OWN_BUILD_MAX, PRACTICE_LABELS, TIMELINE_LABELS } from '@/data/preferences';
import { createProfileMediaSignedUrl, deleteProfilePhoto, PROFILE_PHOTO_BUCKET, VOICE_INTRODUCTION_BUCKET, reorderProfilePhotos, uploadProfilePhoto, uploadVoiceIntroduction } from '@/api/profileMedia';
import { AudioGreeting } from '@/components/introductions/AudioGreeting';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelfieVerificationCard } from '@/components/verification/SelfieVerificationCard';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { queryKeys } from '@/lib/queryClient';
import { testIds } from '@/lib/testIds';
import { BIO_MIN_LENGTH, getProfileReadiness, readinessSteps, recommendedSteps } from '@/lib/profileReadiness';
import { ReadinessChecklist } from '@/components/readiness/ReadinessChecklist';
import { browserDeviceCoordinates, nativeDevicePlace } from '@/lib/deviceLocation';
import { placeFromBrowserCoordinates } from '@/lib/browserPlace';
import { CITY_GROUPS, placeForCity } from '@/data/cities';
import { useI18n, type Translate } from '@/i18n';
import { useSession } from '@/state/session';
import type { TranslationKey } from '@/i18n/catalog';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { PhotoReorderGrid } from '@/components/you/PhotoReorderGrid';
import { SelectField } from '@/components/ui/SelectField';
import { optionLabel, storedLabel, type CatalogGroup } from '@/data/catalogOption';
import { SECT_GROUPS, sectOf } from '@/data/sects';
import { LANGUAGE_GROUPS, languageCodeFor, languageName } from '@/data/spokenLanguages';
import { showNotice } from '@/lib/notice';
import { useToast } from '@/state/toast';
import { EDUCATION_GROUPS } from '@/data/educationLevels';
import { OCCUPATION_GROUPS } from '@/data/occupations';
import { USE_MOCKS } from '@/lib/supabase';
import type { MarriageTimeline, PrivatePreferences, Profile, ReligiousPractice } from '@/types';
import { errorMessage } from '@/lib/errorMessage';
import type { ReadinessStep } from '@/lib/profileReadiness';
import { styles } from './profileTabStyles';

function profileSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(2, t('profile.validation.name')),
    occupation: z.string().min(2, t('profile.validation.occupation')),
    education: z.string().max(120, t('profile.validation.education')),
    bio: z.string().trim().min(BIO_MIN_LENGTH, t('profile.validation.bioShort')).max(600, t('profile.validation.bioLong')),
    values: z.string().max(180, t('profile.validation.values')),
    languages: z.array(z.string()).max(12),
    // A new account has none of these yet. Without a message here the form
    // refused to save and never said why.
    religiousPractice: z.enum(['very_practicing', 'practicing', 'moderate', 'learning'], {
      message: t('profile.practice'),
    }),
    sect: z.enum(['sunni', 'shia', 'other', 'prefer_not_to_say'], { message: t('profile.sect') }),
    sectDetail: z.string().optional(),
    timeline: z.enum(['within_3_months', 'within_6_months', 'within_1_year', '1_to_2_years'], {
      message: t('profile.timing'),
    }),
  });
}

type FormValues = z.infer<ReturnType<typeof profileSchema>>;
type ChecklistTarget = ReadinessStep | 'displayName' | 'location' | 'education' | 'languages'
  | 'childrenWhen' | 'dress' | 'ethnicity' | 'heritage' | 'height' | 'bodyType';

interface PhotoTile {
  /** Stable across a reorder, so a dragged tile keeps its identity. */
  key: string;
  displayUrl: string;
  /** Absent for a profile written before private buckets, and in mock mode. */
  storagePath?: string;
}

function mediaFrom(profile: Profile): PhotoTile[] {
  return profile.photos.map((displayUrl, index) => {
    const storagePath = profile.photoMedia?.[index]?.storagePath;
    return { key: storagePath ?? displayUrl, displayUrl, storagePath };
  });
}

/** Where edits not yet sent are kept on the phone. */
const PENDING_KEY = 'halalmode-pending-profile';

export function ProfileTab({
  profile,
  preferences,
  onOpenPreferences,
  onScrollToTarget,
}: {
  profile: Profile;
  /** For the member's own height, weight and build, kept private but edited here. */
  preferences?: PrivatePreferences;
  onOpenPreferences?: () => void;
  onScrollToTarget: (target: View | null) => void;
}) {
  const { localeTag, isRTL, language, t } = useI18n();
  const { tier } = useSession();
  const [picking, setPicking] = useState<'occupation' | 'education' | null>(null);
  const schema = useMemo(() => profileSchema(t), [t]);
  const queryClient = useQueryClient();
  const toast = useToast();
  // One list, holding both what a photo looks like and where it lives. They
  // used to be two arrays lined up by index, which a reorder would have pulled
  // apart the first time somebody dragged anything.
  const [media, setMedia] = useState<PhotoTile[]>(() => mediaFrom(profile));
  const photos = useMemo(() => media.map((tile) => tile.displayUrl), [media]);
  const [photoOrderError, setPhotoOrderError] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState(profile.audioGreetingUrl);
  const [voiceDuration, setVoiceDuration] = useState(
    profile.audioDurationSeconds ?? 30
  );
  const [savingVoice, setSavingVoice] = useState(false);
  const [photosDirty, setPhotosDirty] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<
    { storagePath: string; removeLocally: () => void } | null
  >(null);
  const [languagePicker, setLanguagePicker] = useState(false);
  const [sectPicker, setSectPicker] = useState(false);
  // Your own figures: private, never on your profile, but they are about you,
  // so they are filled in here rather than among the partner filters.
  const [ownHeight, setOwnHeight] = useState(preferences?.ownHeightCm ? String(preferences.ownHeightCm) : '');
  const [ownWeight, setOwnWeight] = useState(preferences?.ownWeightKg ? String(preferences.ownWeightKg) : '');
  // Up to two body types; the first is the main one matching compares.
  const [ownBuilds, setOwnBuilds] = useState<string[]>(
    [preferences?.ownBuild, preferences?.ownBuildAlso].filter((build): build is string => Boolean(build))
  );
  const ownBuild = ownBuilds[0];
  const [ownDirty, setOwnDirty] = useState(false);
  const [buildPicker, setBuildPicker] = useState(false);
  // Matching answers about yourself, used by members' Premium filters.
  const [hasChildren, setHasChildren] = useState<Profile['hasChildren']>(profile.hasChildren);
  const [religiousDress, setReligiousDress] = useState<string | undefined>(profile.religiousDress);
  const [ethnicities, setEthnicities] = useState<string[]>(profile.ethnicities ?? []);
  const [heritage, setHeritage] = useState<string[]>(profile.heritageCountries ?? []);
  const [grewUp, setGrewUp] = useState<string[]>(profile.grewUpCountries ?? []);
  const [diet, setDiet] = useState<string[]>(profile.diet ?? []);
  const [detailPicker, setDetailPicker] = useState<'dress' | 'ethnicity' | 'heritage' | 'grewUp' | null>(null);
  // The column has a default, so only an answer the member chose counts.
  const [familyGoals, setFamilyGoals] = useState<Profile['familyGoals'] | undefined>(
    profile.familyGoalsAnswered ? profile.familyGoals : undefined
  );
  const heightMissing = !(Number(ownHeight) >= 140 && Number(ownHeight) <= 210);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationExplainer, setLocationExplainer] = useState(false);
  const [cityPicker, setCityPicker] = useState(false);
  const loadedProfileId = useRef<string | null>(null);
  const finishingRecording = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const currentLocation = [profile.city, profile.country].filter(Boolean).join(', ')
    || t('profile.locationNotSet');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      occupation: profile.occupation,
      education: profile.education ?? '',
      bio: profile.bio,
      values: profile.chips.join(', '),
      languages: languageCodes(profile.languagesSpoken),
      religiousPractice: profile.religiousPractice,
      sect: profile.sect,
      sectDetail: profile.sectDetail,
      timeline: profile.timeline,
    },
  });
  const draft = useWatch({ control });
  const serverReadinessQuery = useQuery({
    queryKey: queryKeys.profileReadiness,
    queryFn: fetchMyProfileReadiness,
    enabled: !USE_MOCKS,
    // Always ask again on opening: a Preferences save elsewhere may have
    // completed the checklist since this was last fetched.
    refetchOnMount: 'always',
  });
  // The checklist ticks as the member types; the server decides when
  // introductions start, so "complete" waits for a save it agrees with.
  const liveReadiness = getProfileReadiness({
    firstName: draft.name,
    city: profile.city,
    country: profile.country,
    bio: draft.bio,
    photoCount: photos.length,
    languages: draft.languages as string[] | undefined,
    education: draft.education,
    hasChildren,
    familyGoalsAnswered: Boolean(familyGoals),
    religiousDress,
    gender: profile.gender,
    ethnicities,
    heritageCountries: heritage,
    ownHeightCm: Number(ownHeight),
    ownBuild,
    preferencesSaved: serverReadinessQuery.data
      ? !serverReadinessQuery.data.missing.includes('preferences')
      : undefined,
  });
  const unsaved = isDirty || photosDirty || ownDirty;
  // Everything edited outside the form, as one string: it changes with each edit,
  // and tells a save which of these edits it carried.
  const ownSignature = JSON.stringify([ownHeight, ownWeight, ownBuilds, hasChildren, familyGoals, religiousDress, ethnicities, heritage, grewUp, diet]);
  const latestOwnSignature = useRef(ownSignature);
  latestOwnSignature.current = ownSignature;
  const sentOwnSignature = useRef(ownSignature);
  const readyToShow = !unsaved && liveReadiness.ready
    && (USE_MOCKS || serverReadinessQuery.data?.ready === true);
  const steps = readinessSteps(liveReadiness.missing, profile.gender);
  // Optional, and shown only once the required steps are done.
  const optionalSteps = recommendedSteps(liveReadiness.recommended, profile.gender);
  const checklistTargets = useRef<Partial<Record<ChecklistTarget, View | null>>>({});
  const setChecklistTarget = (targetName: ChecklistTarget, target: View | null) => {
    checklistTargets.current[targetName] = target;
  };
  const pressChecklistStep = (step: ReadinessStep) => {
    if (step === 'preferences') {
      onOpenPreferences?.();
      return;
    }
    const targetName: ChecklistTarget = step === 'essentials'
      ? (String(draft.name ?? '').trim().length < 2 ? 'displayName' : 'location')
      : step === 'details'
        ? (!(draft.education ?? '').trim() ? 'education' : 'languages')
        : step === 'children'
          ? (!hasChildren ? 'children' : 'childrenWhen')
          : step === 'faith'
            ? (profile.gender === 'female' && !religiousDress
              ? 'dress'
              : ethnicities.length === 0 ? 'ethnicity' : 'heritage')
            : step === 'background'
              ? (ethnicities.length === 0 ? 'ethnicity' : 'heritage')
              : step === 'body'
                ? (heightMissing ? 'height' : 'bodyType')
                : step;
    onScrollToTarget(checklistTargets.current[targetName] ?? null);
  };

  useEffect(() => {
    setMedia(mediaFrom(profile));
    setVoiceUrl(profile.audioGreetingUrl);
    setVoiceDuration(profile.audioDurationSeconds ?? 30);
    setPhotosDirty(false);
    if (loadedProfileId.current === profile.id) return;
    loadedProfileId.current = profile.id;
    reset({
      name: profile.name,
      occupation: profile.occupation,
      education: profile.education ?? '',
      bio: profile.bio,
      values: profile.chips.join(', '),
      languages: languageCodes(profile.languagesSpoken),
      religiousPractice: profile.religiousPractice,
      sect: profile.sect,
      sectDetail: profile.sectDetail,
      timeline: profile.timeline,
    });
  }, [profile, reset]);

  const startVoiceRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      showPermissionRecovery(
        permission.canAskAgain,
        t,
        t('profile.micTitle'),
        t('profile.micBody')
      );
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      showNotice(t('profile.recordStartError'), t('profile.connectionError'));
      await setAudioModeAsync({ allowsRecording: false });
    }
  }, [recorder, t]);

  const finishVoiceRecording = useCallback(async () => {
    if (finishingRecording.current || !recorder.isRecording) return;
    finishingRecording.current = true;
    setSavingVoice(true);
    try {
      const durationSeconds = Math.max(1, Math.round(recorder.currentTime));
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!recorder.uri) throw new Error(t('profile.recordFileError'));

      if (USE_MOCKS) {
        setVoiceUrl(recorder.uri);
        setVoiceDuration(durationSeconds);
        return;
      }

      const uploaded = await uploadVoiceIntroduction(
        { uri: recorder.uri, mimeType: 'audio/mp4' },
        durationSeconds
      );
      const displayUrl = await createProfileMediaSignedUrl(
        VOICE_INTRODUCTION_BUCKET,
        uploaded.path
      );
      setVoiceUrl(displayUrl);
      setVoiceDuration(durationSeconds);
      queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
        current
          ? {
              ...current,
              audioGreetingUrl: displayUrl,
              audioGreetingStoragePath: uploaded.path,
              audioDurationSeconds: durationSeconds,
            }
          : current
      );
      if (uploaded.cleanupPendingPath) {
        showNotice(t('profile.voiceSaved'), t('profile.voiceCleanup'));
      } else {
        toast.show(`✓ ${t('filters.saved')}`);
      }
    } catch {
      showNotice(t('profile.voiceSaveError'), t('profile.connectionError'));
    } finally {
      finishingRecording.current = false;
      setSavingVoice(false);
    }
  }, [queryClient, recorder, t, toast]);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= 29_750) {
      void finishVoiceRecording();
    }
  }, [finishVoiceRecording, recorderState.durationMillis, recorderState.isRecording]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const patch: Partial<Profile> = {
        name: values.name.trim(),
        // One name now. The column stays because introductions read it.
        firstName: values.name.trim().slice(0, 60),
        occupation: values.occupation.trim(),
        // The server converts an empty string to NULL, so members can clear it.
        education: values.education.trim(),
        bio: values.bio.trim(),
        chips: splitProfileList(values.values),
        languagesSpoken: values.languages,
        religiousPractice: values.religiousPractice,
        timeline: values.timeline,
        ...(familyGoals ? { familyGoals } : {}),
      };
      if (USE_MOCKS && photosDirty) patch.photos = photos;
      await updateMyProfile(patch);
      await setMyProfileDetails({
        hasChildren,
        religiousDress: profile.gender === 'female' ? religiousDress : undefined,
        ethnicities,
        heritageCountries: heritage,
      });
      await setMyLifestyle({ grewUpCountries: grewUp, diet });
      await updateMyPreferences({
        ownHeightCm: Number(ownHeight) || 0,
        ownWeightKg: Number(ownWeight) || 0,
        ownBuild,
        // An empty second answer clears it; the server stores it as none.
        ownBuildAlso: ownBuilds[1] ?? '',
      });
      // Sect was never in the general patch, so it silently never saved.
      await setMySect(values.sect, values.sectDetail);
    },
    onSuccess: (_data, values) => {
      const saved: Profile = {
        ...profile,
        ...values,
        firstName: values.name.trim().slice(0, 60),
        education: values.education.trim() || undefined,
        photos,
        chips: splitProfileList(values.values),
        languagesSpoken: values.languages,
        religiousPractice: values.religiousPractice,
        sect: values.sect,
        timeline: values.timeline,
        // Kept in the cached profile too, so the answers survive a tab switch.
        hasChildren,
        religiousDress,
        ethnicities,
        heritageCountries: heritage,
        grewUpCountries: grewUp,
        diet,
        familyGoals: familyGoals ?? profile.familyGoals,
        familyGoalsAnswered: Boolean(familyGoals) || profile.familyGoalsAnswered,
      };
      queryClient.setQueryData(queryKeys.profile('me'), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
      // Keep anything typed while this was being sent: only the saved values become the new baseline.
      reset(values, { keepValues: true });
      setPhotosDirty(false);
      if (latestOwnSignature.current === sentOwnSignature.current) setOwnDirty(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
    },
  });



  // Edits are also kept on the phone until they have gone to the server, so closing
  // the app or losing signal first does not lose them.
  const snapshot = JSON.stringify({
    form: draft,
    own: { ownHeight, ownWeight, ownBuilds, hasChildren, familyGoals, religiousDress, ethnicities, heritage, grewUp, diet },
  });
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  useEffect(() => {
    if (unsaved) void AsyncStorage.setItem(PENDING_KEY, snapshot).catch(() => undefined);
  }, [unsaved, snapshot]);
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(PENDING_KEY).then((stored) => {
      if (cancelled || !stored) return;
      try {
        const kept = JSON.parse(stored) as { form?: Record<string, unknown>; own?: Record<string, unknown> };
        Object.entries(kept.form ?? {}).forEach(([key, value]) => {
          if (value !== undefined) setValue(key as keyof FormValues, value as never, { shouldDirty: true });
        });
        const own = kept.own ?? {};
        if (typeof own.ownHeight === 'string') setOwnHeight(own.ownHeight);
        if (typeof own.ownWeight === 'string') setOwnWeight(own.ownWeight);
        if (Array.isArray(own.ownBuilds)) setOwnBuilds(own.ownBuilds as string[]);
        if (own.hasChildren) setHasChildren(own.hasChildren as Profile['hasChildren']);
        if (own.familyGoals) setFamilyGoals(own.familyGoals as Profile['familyGoals']);
        if (typeof own.religiousDress === 'string') setReligiousDress(own.religiousDress);
        if (Array.isArray(own.ethnicities)) setEthnicities(own.ethnicities as string[]);
        if (Array.isArray(own.heritage)) setHeritage(own.heritage as string[]);
        if (Array.isArray(own.grewUp)) setGrewUp(own.grewUp as string[]);
        if (Array.isArray(own.diet)) setDiet(own.diet as string[]);
        setOwnDirty(true);
      } catch {
        void AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  // Once, when the tab opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The automatic save. Nothing is outlined in red while someone is still typing:
  // if a required box is empty it simply waits for the next change.
  const saveQuietly = async (): Promise<SaveResult> => {
    let result: SaveResult = 'invalid';
    await handleSubmit(
      async (values) => {
        sentOwnSignature.current = latestOwnSignature.current;
        const sentSnapshot = latestSnapshot.current;
        try {
          await save.mutateAsync(values);
          result = 'saved';
          // Only forget the copy on the phone if nothing newer has been kept since.
          if (latestSnapshot.current === sentSnapshot) void AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
        } catch (error) {
          result = isNetworkError(error) ? 'offline' : 'failed';
        }
      },
      () => undefined,
    )().catch(() => undefined);
    return result;
  };
  // Every edit is kept at once and sent as one batch a few seconds after the
  // last one (see useAutosave); the "Saved" toast comes when it has gone through.
  const { flush } = useAutosave({
    dirty: unsaved,
    version: JSON.stringify([draft, ownSignature, photosDirty]),
    onLocalSave: () => toast.show(`✓ ${t('filters.saved')}`),
    onFailure: (kind) => toast.show(t(kind === 'offline' ? 'autosave.offline' : 'autosave.retry')),
    save: saveQuietly,
  });
  useRegisterUnsaved(unsaved, flush);

  const refreshDeviceLocation = useCallback(async () => {
    if (updatingLocation) return;
    setUpdatingLocation(true);
    setLocationError(null);
    try {
      if (Platform.OS === 'web') {
        const coordinates = await browserDeviceCoordinates();
        const resolved = await placeFromBrowserCoordinates(coordinates);
        if (!resolved) {
          setLocationError(t('profile.locationUnavailable'));
          return;
        }
        await updateMyLocation(resolved);
        toast.show(`✓ ${t('filters.saved')}`);
        queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
          current ? { ...current, city: resolved.city, country: resolved.country } : current
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
        void queryClient.invalidateQueries({ queryKey: queryKeys.round });
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationError(t('profile.locationPermissionRequired'));
        if (!permission.canAskAgain) {
          showPermissionRecovery(
            false,
            t,
            t('profile.locationPermissionTitle'),
            t('profile.locationPermissionRequired')
          );
        }
        return;
      }

      const resolved = await nativeDevicePlace(
        () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        coordinates => Location.reverseGeocodeAsync(coordinates),
      );
      if (!resolved) {
        setLocationError(t('profile.locationUnavailable'));
        return;
      }

      await updateMyLocation(resolved);
      toast.show(`✓ ${t('filters.saved')}`);
      queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
        current ? { ...current, city: resolved.city, country: resolved.country } : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    } catch {
      setLocationError(t('profile.locationUpdateError'));
    } finally {
      setUpdatingLocation(false);
    }
  }, [queryClient, t, toast, updatingLocation]);

  // Premium travel mode only; see the button below.
  const chooseCity = async (id: string | undefined) => {
    const place = id ? placeForCity(id) : null;
    if (!place || updatingLocation) return;
    setUpdatingLocation(true);
    setLocationError(null);
    try {
      await updateMyLocation(place);
      toast.show(`✓ ${t('filters.saved')}`);
      queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
        current ? { ...current, city: place.city, country: place.country } : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    } catch {
      setLocationError(t('profile.locationUpdateError'));
    } finally {
      setUpdatingLocation(false);
    }
  };

  /**
   * Explain first, but only while there is still something to explain.
   *
   * Once permission has been granted the reason has been made and accepted,
   * and re-reading it every time somebody updates their city would be a
   * lecture. So the sheet appears only when the system has not been asked yet.
   */
  const askForLocation = useCallback(async () => {
    if (updatingLocation) return;
    // Safari can reject Expo's permission preflight when it is not called
    // directly from the browser gesture. Let the explainer's Continue button
    // make the native geolocation request instead.
    if (Platform.OS === 'web') {
      setLocationExplainer(true);
      return;
    }
    const existing = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (existing?.granted) {
      void refreshDeviceLocation();
      return;
    }
    setLocationExplainer(true);
  }, [refreshDeviceLocation, updatingLocation]);

  const addPhoto = async (source: 'camera' | 'library') => {
    if (photos.length >= 6) {
      showNotice(t('profile.photoLimitTitle'), t('profile.photoLimitBody'));
      return;
    }
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showPermissionRecovery(
        permission.canAskAgain,
        t,
        t('profile.permissionTitle'),
        t('profile.permissionBody')
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.9, aspect: [3, 4] })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.9,
            mediaTypes: ['images'],
          });

    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (asset.mimeType && !supportedTypes.includes(asset.mimeType)) {
      showNotice(t('profile.formatTitle'), t('profile.formatBody'));
      return;
    }
    // Crop and position first; the upload happens once it is confirmed.
    setCropping({ uri: asset.uri });
  };

  /** A new photo, cropped and confirmed: saved as it is, then fixed in place. */
  const saveCropped = async (uri: string) => {
    setCropping(null);
    {
      if (USE_MOCKS) {
        setMedia((current) => [...current, { key: uri, displayUrl: uri }]);
        setPhotosDirty(true);
        return;
      }

      setUploadingPhoto(true);
      try {
        // Cropping re-encodes every photo as JPEG.
        const uploaded = await uploadProfilePhoto({ uri, mimeType: 'image/jpeg' });
        const displayUrl = await createProfileMediaSignedUrl(
          PROFILE_PHOTO_BUCKET,
          uploaded.path
        );
        const nextPhotos = [...photos, displayUrl];
        setMedia((current) => [
          ...current,
          { key: uploaded.path, displayUrl, storagePath: uploaded.path },
        ]);
        queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
          current
            ? {
                ...current,
                photos: nextPhotos,
                photoMedia: [
                  ...(current.photoMedia ?? current.photos.map((url) => ({ displayUrl: url }))),
                  { displayUrl, storagePath: uploaded.path },
                ],
              }
            : current
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
        toast.show(`✓ ${t('filters.saved')}`);
      } catch {
        showNotice(t('profile.uploadError'), t('profile.connectionError'));
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const [cropping, setCropping] = useState<{ uri: string } | null>(null);

  const removePhoto = (index: number) => {
    if (photos.length <= 1) {
      showNotice(t('profile.keepOneTitle'), t('profile.keepOneBody'));
      return;
    }

    const removeLocally = () => {
      const nextPhotos = photos.filter((_, photoIndex) => photoIndex !== index);
      setMedia((current) => current.filter((_, photoIndex) => photoIndex !== index));
      if (USE_MOCKS) {
        setPhotosDirty(true);
        return;
      }
      queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
        current
          ? {
              ...current,
              photos: nextPhotos,
              photoMedia: current.photoMedia?.filter(
                (_, photoIndex) => photoIndex !== index
              ),
            }
          : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
    };

    if (USE_MOCKS) {
      removeLocally();
      return;
    }

    // Read from the local list, not the cached profile: after a reorder those
    // two disagree about which photo index 2 is.
    const storagePath = media[index]?.storagePath;
    if (!storagePath) {
      showNotice(t('profile.removeLegacyTitle'), t('profile.removeLegacyBody'));
      return;
    }

    // A modal of our own, not Alert: Alert.alert does nothing on the web, so
    // the X looked broken there.
    setPendingRemoval({ storagePath, removeLocally });
  };

  const confirmRemoval = () => {
    const pending = pendingRemoval;
    setPendingRemoval(null);
    if (!pending) return;
    setDeletingPhoto(pending.storagePath);
    void deleteProfilePhoto(pending.storagePath)
      .then(() => {
        pending.removeLocally();
        toast.show(`✓ ${t('filters.saved')}`);
      })
      .catch(() => {
        showNotice(t('profile.removeError'), t('profile.connectionError'));
      })
      .finally(() => setDeletingPhoto(null));
  };

  /**
   * The new order is shown immediately and saved behind it.
   *
   * Waiting for the server would make a drag feel like it had not worked, so
   * the list moves first. If the save is refused the previous order comes back
   * and the member is told, rather than being left with an arrangement that
   * only exists on their own phone.
   */
  const reorderPhotos = (next: PhotoTile[]) => {
    const previous = media;
    setMedia(next);
    setPhotoOrderError(null);

    if (USE_MOCKS) {
      setPhotosDirty(true);
      toast.show(`✓ ${t('filters.saved')}`);
      return;
    }

    const paths = next.map((tile) => tile.storagePath);
    // A profile from before private buckets has no paths to send.
    if (paths.some((path) => !path)) return;

    void reorderProfilePhotos(paths as string[])
      .then(() => {
        queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
          current
            ? {
                ...current,
                photos: next.map((tile) => tile.displayUrl),
                photoMedia: next.map((tile) => ({
                  displayUrl: tile.displayUrl,
                  storagePath: tile.storagePath,
                })),
              }
            : current,
        );
        toast.show(`✓ ${t('filters.saved')}`);
      })
      .catch(() => {
        setMedia(previous);
        setPhotoOrderError(t('profile.photoOrderError'));
      });
  };

  return (
    <View style={[styles.wrap, isRTL && styles.rtl]}>
      <View style={styles.stack}>
      <SelfieVerificationCard />
      <Card tone="filled" style={styles.readinessCard}>
        {readyToShow ? (
          <>
            <Text variant="label">{t('profile.readinessReadyTitle')}</Text>
            <Text variant="caption" style={styles.readinessBody}>
              {t('profile.readinessReadyBody')}
            </Text>
          </>
        ) : (
          <ReadinessChecklist
            steps={steps}
            lead={liveReadiness.ready ? t('readiness.saveToFinish') : t('readiness.lead')}
            isPressable={(step) => step !== 'preferences' || Boolean(onOpenPreferences)}
            onPressStep={pressChecklistStep}
          />
        )}
        {save.isPending ? (
          <Text variant="caption" style={styles.readinessBody}>{t('common.saving')}</Text>
        ) : null}
      </Card>
      {liveReadiness.ready && optionalSteps.length > 0 ? (
        <Card tone="filled" style={styles.readinessCard}>
          <ReadinessChecklist
            title={t('readiness.optionalTitle')}
            steps={optionalSteps}
            lead={t('readiness.optionalLead')}
            isPressable={(step) => step !== 'preferences' || Boolean(onOpenPreferences)}
            onPressStep={pressChecklistStep}
          />
        </Card>
      ) : null}
      <View ref={(target) => setChecklistTarget('photo', target)} collapsable={false}>
      {photos.length === 0 ? (
        <Card testID={testIds.you.photoGuide} tone="filled" style={styles.photoGuide}>
          <Text variant="micro">{t('profile.photoGuideTitle')}</Text>
          <Text variant="caption" style={styles.photoGuideBody}>
            {t('profile.photoGuideBody')}
          </Text>
          <View style={styles.photoGuideRules}>
            {[
              'profile.photoGuideFace',
              'profile.photoGuideSelf',
              'profile.photoGuideFilter',
            ].map((key) => (
              <View key={key} style={[styles.photoGuideRule, isRTL && styles.rowRTL]}>
                <View style={styles.photoGuideMark} />
                <Text variant="caption" style={styles.photoGuideRuleText}>
                  {t(key as 'profile.photoGuideFace' | 'profile.photoGuideSelf' | 'profile.photoGuideFilter')}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.photoActions, isRTL && styles.rowRTL]}>
            <Button
              label={t('profile.photoGuideCamera')}
              variant="secondary"
              disabled={uploadingPhoto}
              onPress={() => void addPhoto('camera')}
              style={styles.photoGuideAction}
            />
            <Button
              label={t('profile.photoGuideLibrary')}
              disabled={uploadingPhoto}
              loading={uploadingPhoto}
              onPress={() => void addPhoto('library')}
              style={styles.photoGuideAction}
            />
          </View>
        </Card>
      ) : null}
      <Card>
        <View style={[styles.cardHead, isRTL && styles.rowRTL]}>
          <Text variant="micro">{required(t('profile.gallery'))}</Text>
        </View>

        <PhotoReorderGrid
          photos={media}
          profileId={profile.id}
          onReorder={reorderPhotos}
          onRemove={removePhoto}
          onAdd={() => void addPhoto('library')}
          removeDisabled={deletingPhoto !== null}
          addDisabled={uploadingPhoto}
          emptyLabel={t('profile.emptySlot')}
          mainLabel={t('profile.main')}
          removeLabel={(position) => t('profile.removePhotoA11y', { count: position })}
          dragHintLabel={t('profile.photoDragHint')}
          moveEarlierLabel={t('profile.photoMoveEarlier')}
          moveLaterLabel={t('profile.photoMoveLater')}
        />

        {media.length > 1 ? (
          <Text variant="caption" style={styles.photoNote}>
            {t('profile.photoOrderNote')}
          </Text>
        ) : null}

        {photoOrderError ? (
          <Text accessibilityRole="alert" variant="caption" style={styles.locationError}>
            {photoOrderError}
          </Text>
        ) : null}

        <Text variant="caption" style={styles.photoNote}>
          {t('profile.photoNote')}
        </Text>

        <View style={[styles.photoActions, isRTL && styles.rowRTL]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.camera')}
            accessibilityState={{ busy: uploadingPhoto, disabled: uploadingPhoto }}
            disabled={uploadingPhoto}
            onPress={() => void addPhoto('camera')}
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonLabel}>
              {uploadingPhoto ? t('profile.uploading') : t('profile.camera')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.files')}
            accessibilityState={{ busy: uploadingPhoto, disabled: uploadingPhoto }}
            disabled={uploadingPhoto}
            onPress={() => void addPhoto('library')}
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonLabel}>{t('profile.files')}</Text>
          </Pressable>
        </View>
      </Card>
      </View>

      <Card>
        <Text variant="micro">{t('profile.voice')}</Text>
        {voiceUrl && !recorderState.isRecording ? (
          <View style={styles.voicePlayer}>
            <AudioGreeting
              durationSeconds={voiceDuration}
              url={voiceUrl}
              storagePath={profile.audioGreetingStoragePath}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.recordAgain')}
              accessibilityState={{ busy: savingVoice, disabled: savingVoice }}
              disabled={savingVoice}
              onPress={() => void startVoiceRecording()}
              style={styles.recordAgain}
            >
              <Text style={styles.recordAgainLabel}>{t('profile.recordAgain')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              recorderState.isRecording
                ? t('profile.stopA11y')
                : t('profile.recordA11y')
            }
            accessibilityState={{ busy: savingVoice }}
            disabled={savingVoice}
            onPress={() =>
              void (recorderState.isRecording
                ? finishVoiceRecording()
                : startVoiceRecording())
            }
            style={[styles.recordZone, recorderState.isRecording && styles.recordZoneActive]}
          >
            <View style={styles.recordDot}>
              <Text style={styles.recordGlyph}>
                {recorderState.isRecording ? '■' : '●'}
              </Text>
            </View>
            <Text variant="label" style={styles.recordLabel}>
              {savingVoice
                ? t('profile.savingVoice')
                : recorderState.isRecording
                  ? t('profile.stopSave', { seconds: new Intl.NumberFormat(localeTag).format(Math.min(30, Math.round(recorderState.durationMillis / 1000))) })
                  : t('profile.recordIntro')}
            </Text>
          </Pressable>
        )}
        <Text variant="caption" style={styles.voiceNote}>
          {t('profile.voicePrivacy')}
        </Text>
      </Card>

      </View>
      <View style={styles.stack}>
      <Card style={styles.formCard}>
        <Text variant="caption" style={styles.requiredNote}>
          {t('profile.requiredNote')}
        </Text>
        <View
          ref={(target) => setChecklistTarget('displayName', target)}
          collapsable={false}
          style={styles.formRow}
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Field
                label={required(t('profile.displayName'))}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />
        </View>

        <View ref={(target) => setChecklistTarget('location', target)} collapsable={false} style={styles.locationBlock}>
          <Text variant="micro">{required(t('profile.locationCurrent'))}</Text>
          <Text
            accessibilityLabel={`${t('profile.locationCurrent')}: ${currentLocation}`}
            variant="label"
          >
            {currentLocation}
          </Text>
          <Text variant="caption" style={styles.locationPrivacy}>
            {t('profile.locationPrivacy')}
          </Text>
          <Button
            testID={testIds.you.updateLocation}
            label={t('profile.updateLocation')}
            variant="secondary"
            loading={updatingLocation}
            onPress={() => void askForLocation()}
          />
          {/* Travel mode (Premium): appear in another city before a move or a
              long visit. Everyone else is placed by their device, so nobody
              can claim to live somewhere they do not. */}
          <Button
            label={tier === 'premium' ? t('profile.travelMode') : `${t('profile.travelMode')} · Premium`}
            variant="quiet"
            disabled={updatingLocation}
            onPress={() => {
              if (tier === 'premium') setCityPicker(true);
              else showNotice(t('profile.travelPremiumTitle'), t('profile.travelPremiumBody'));
            }}
          />
          <PickerSheet
            visible={cityPicker}
            groups={CITY_GROUPS}
            selected={[]}
            onChange={(next) => void chooseCity(next[0])}
            onClose={() => setCityPicker(false)}
            title={t('profile.travelPickerTitle')}
            eyebrow={t('profile.travelMode')}
            searchLabel={t('onboarding.chooseCitySearch')}
          />
          <PermissionExplainer
            visible={locationExplainer}
            eyebrow={t('permission.location.eyebrow')}
            title={t('permission.location.title')}
            body={t('permission.location.body')}
            points={[
              t('permission.location.p1'),
              t('permission.location.p2'),
              t('permission.location.p3'),
            ]}
            reassurance={t('permission.location.reassurance')}
            continueLabel={t('permission.continue')}
            cancelLabel={t('permission.notNow')}
            onContinue={() => {
              setLocationExplainer(false);
              if (Platform.OS === 'web') {
                void refreshDeviceLocation();
              } else {
                setTimeout(() => void refreshDeviceLocation(), 120);
              }
            }}
            onCancel={() => setLocationExplainer(false)}
            testID={testIds.you.locationExplainer}
          />
          {locationError ? (
            <Text accessibilityRole="alert" variant="caption" style={styles.locationError}>
              {locationError}
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="occupation"
          render={({ field }) => (
            <>
              <SelectField
                label={t('profile.profession')}
                value={storedLabel(OCCUPATION_GROUPS, field.value, language)}
                placeholder={t('profile.professionPlaceholder')}
                onPress={() => setPicking('occupation')}
                error={errors.occupation?.message}
                testID={testIds.you.professionSelect}
              />
              <PickerSheet
                visible={picking === 'occupation'}
                groups={OCCUPATION_GROUPS}
                selected={field.value ? [field.value] : []}
                onChange={(next) => field.onChange(next[0] ?? '')}
                onClose={() => setPicking(null)}
                title={t('profile.profession')}
                eyebrow={t('profile.professionEyebrow')}
                searchLabel={t('profile.professionSearch')}
                testID={testIds.you.professionSheet}
              />
            </>
          )}
        />

        <View ref={(target) => setChecklistTarget('education', target)} collapsable={false}>
        <Controller
          control={control}
          name="education"
          render={({ field }) => (
            <>
              <SelectField
                label={t('filters.education')}
                value={storedLabel(EDUCATION_GROUPS, field.value, language)}
                placeholder={t('profile.educationPlaceholder')}
                onPress={() => setPicking('education')}
                error={errors.education?.message}
                testID={testIds.you.educationSelect}
              />
              <PickerSheet
                visible={picking === 'education'}
                groups={EDUCATION_GROUPS}
                selected={field.value ? [field.value] : []}
                onChange={(next) => field.onChange(next[0] ?? '')}
                onClose={() => setPicking(null)}
                title={t('profile.education')}
                eyebrow={t('profile.educationEyebrow')}
                searchLabel={t('profile.educationSearch')}
                clearLabel={t('profile.educationClear')}
                testID={testIds.you.educationSheet}
              />
            </>
          )}
        />
        </View>

        <View ref={(target) => setChecklistTarget('bio', target)} collapsable={false}>
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <Field
              label={required(t('profile.bio'))}
              placeholder={t('profile.bioPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              // Only once a save is refused: while writing, the prompt in the
              // empty box does the encouraging.
              error={errors.bio?.message}
              multiline
            />
          )}
        />
        </View>

        <Controller
          control={control}
          name="values"
          render={({ field }) => (
            <Field
              label={t('profile.values')}
              placeholder={t('profile.valuesPlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.values?.message}
            />
          )}
        />

        <View ref={(target) => setChecklistTarget('languages', target)} collapsable={false}>
        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <>
              <SelectField
                label={t('profile.languages')}
                value={field.value.map((code) => languageName(code, language)).join(', ')}
                placeholder={t('profile.languagesPlaceholder')}
                onPress={() => setLanguagePicker(true)}
                error={errors.languages?.message}
              />
              <PickerSheet
                visible={languagePicker}
                groups={LANGUAGE_GROUPS}
                selected={field.value}
                selectionMode="multiple"
                maxSelected={12}
                onChange={(next) => field.onChange(next)}
                onClose={() => setLanguagePicker(false)}
                title={t('profile.languages')}
                eyebrow={t('profile.languagesSearch')}
                searchLabel={t('profile.languagesSearch')}
              />
            </>
          )}
        />
        </View>

        <View style={styles.profileChoice}>
          <Text variant="micro">{t('profile.practice')}</Text>
          <Controller
            control={control}
            name="religiousPractice"
            render={({ field }) => (
              <View style={[styles.choiceChips, errors.religiousPractice && styles.choiceMissing]}>
                {(Object.keys(PRACTICE_LABELS) as ReligiousPractice[]).map((value) => (
                  <Chip
                    key={value}
                    label={practiceLabel(value, t)}
                    selected={field.value === value}
                    onPress={() => field.onChange(value)}
                  />
                ))}
              </View>
            )}
          />
          {errors.religiousPractice ? (
            <Text accessibilityRole="alert" variant="caption" style={styles.fieldError}>
              {t('profile.missingFields', { fields: t('profile.practice') })}
            </Text>
          ) : null}
        </View>

        <View style={styles.profileChoice}>
          <Controller
            control={control}
            name="sectDetail"
            render={({ field: detail }) => (
              <Controller
                control={control}
                name="sect"
                render={({ field }) => {
                  const chosen = detail.value ?? field.value;
                  return (
                    <>
                      <SelectField
                        label={t('profile.sect')}
                        value={chosen ? sectChoiceLabel(chosen, language, t) : ''}
                        placeholder={t('profile.sectPlaceholder')}
                        onPress={() => setSectPicker(true)}
                        error={errors.sect?.message}
                      />
                      <PickerSheet
                        visible={sectPicker}
                        groups={profileSectGroups(t)}
                        selected={chosen ? [chosen] : []}
                        onChange={(next) => {
                          const id = next[0];
                          if (!id) return;
                          if (id === 'prefer_not_to_say') {
                            field.onChange('prefer_not_to_say');
                            detail.onChange(undefined);
                            return;
                          }
                          const sect = sectOf(id);
                          if (!sect) return;
                          field.onChange(sect);
                          detail.onChange(id === sect ? undefined : id);
                        }}
                        onClose={() => setSectPicker(false)}
                        title={t('profile.sect')}
                        eyebrow={t('profile.sectPlaceholder')}
                        searchLabel={t('profile.sect')}
                      />
                    </>
                  );
                }}
              />
            )}
          />
          <Text variant="caption" style={styles.choiceNote}>
            {t('profile.sectBody')}
          </Text>
        </View>

        <View style={styles.profileChoice}>
          <Text variant="micro">{t('profile.timing')}</Text>
          <Controller
            control={control}
            name="timeline"
            render={({ field }) => (
              <View style={[styles.choiceChips, errors.timeline && styles.choiceMissing]}>
                {(Object.keys(TIMELINE_LABELS) as MarriageTimeline[]).map((value) => (
                  <Chip
                    key={value}
                    label={timelineLabel(value, t)}
                    selected={field.value === value}
                    onPress={() => field.onChange(value)}
                  />
                ))}
              </View>
            )}
          />
          {errors.timeline ? (
            <Text accessibilityRole="alert" variant="caption" style={styles.fieldError}>
              {t('profile.missingFields', { fields: t('profile.timing') })}
            </Text>
          ) : null}
        </View>

        <View ref={(target) => setChecklistTarget('children', target)} collapsable={false} style={styles.profileChoice}>
          <Text variant="micro">{t('profile.hasChildren')}</Text>
          <View style={[styles.choiceChips]}>
            {HAS_CHILDREN_PROFILE.map((option) => (
              <Chip
                key={option.id}
                label={optionLabel(option, language)}
                selected={hasChildren === option.id}
                onPress={() => { setHasChildren(option.id as Profile['hasChildren']); setOwnDirty(true); }}
              />
            ))}
          </View>
        </View>

        <View ref={(target) => setChecklistTarget('childrenWhen', target)} collapsable={false} style={styles.profileChoice}>
          <Text variant="micro">{t('profile.childrenWhen')}</Text>
          <View style={[styles.choiceChips]}>
            {FAMILY_CHOICES.map(([value, key]) => (
              <Chip
                key={value}
                label={t(key)}
                selected={familyGoals === value}
                onPress={() => { setFamilyGoals(value); setOwnDirty(true); }}
              />
            ))}
          </View>
        </View>

        <MaritalStatusField gender={profile.gender} choiceStyle={styles.profileChoice} chipsStyle={styles.choiceChips} />

        {/* Religious dress is asked of women only. */}
        {profile.gender === 'female' ? (
        <View
          ref={(target) => setChecklistTarget('dress', target)}
          collapsable={false}
          style={styles.profileChoice}
        >
          <SelectField
            label={t('profile.dress')}
            value={religiousDress
              ? optionLabel(dressOptions(profile.gender).find((o) => o.id === religiousDress) ?? { id: religiousDress, en: religiousDress, ar: religiousDress }, language)
              : ''}
            placeholder={t('profile.dress')}
            onPress={() => setDetailPicker('dress')}
          />
          <PickerSheet
            visible={detailPicker === 'dress'}
            groups={asGroups(t('profile.dress'), dressOptions(profile.gender))}
            selected={religiousDress ? [religiousDress] : []}
            onChange={(next) => { setReligiousDress(next[0]); setOwnDirty(true); }}
            onClose={() => setDetailPicker(null)}
            title={t('profile.dress')}
            eyebrow={t('profile.dress')}
            searchLabel={t('profile.dress')}
          />
        </View>
        ) : null}

        <View
          ref={(target) => {
            setChecklistTarget('ethnicity', target);
            if (profile.gender !== 'female') setChecklistTarget('background', target);
          }}
          collapsable={false}
          style={styles.profileChoice}
        >
          {/* Two questions cover everyone: a broad ethnicity (two for mixed
              heritage) and the countries you or your family are from. */}
          <SelectField
            label={t('profile.ethnicity')}
            value={ethnicities
              .map((id) => { const option = findEthnicity(id); return option ? optionLabel(option, language) : id; })
              .join(', ')}
            placeholder={t('profile.ethnicityHint')}
            onPress={() => setDetailPicker('ethnicity')}
          />
          <PickerSheet
            visible={detailPicker === 'ethnicity'}
            groups={ETHNICITY_PROFILE_GROUPS}
            selected={ethnicities}
            selectionMode="multiple"
            maxSelected={ETHNICITY_MAX}
            onChange={(next) => { setEthnicities(withUnstatedAlone(ethnicities, next)); setOwnDirty(true); }}
            onClose={() => setDetailPicker(null)}
            title={t('profile.ethnicity')}
            eyebrow={t('profile.ethnicityHint')}
            searchLabel={t('profile.ethnicity')}
          />
        </View>

        <View ref={(target) => setChecklistTarget('heritage', target)} collapsable={false} style={styles.profileChoice}>
          <SelectField
            label={t('profile.heritage')}
            value={heritage.map((code) => heritageName(code, language)).join(', ')}
            placeholder={t('profile.heritageHint')}
            onPress={() => setDetailPicker('heritage')}
          />
          <PickerSheet
            visible={detailPicker === 'heritage'}
            groups={heritageGroups(language, true)}
            selected={heritage}
            selectionMode="multiple"
            maxSelected={HERITAGE_MAX}
            onChange={(next) => { setHeritage(withUnstatedAlone(heritage, next)); setOwnDirty(true); }}
            onClose={() => setDetailPicker(null)}
            title={t('profile.heritage')}
            eyebrow={t('profile.heritageHint')}
            searchLabel={t('profile.heritageSearch')}
          />
        </View>

        <View style={styles.profileChoice}>
          <SelectField
            label={t('profile.grewUp')}
            value={grewUp.map((code) => heritageName(code, language)).join(', ')}
            placeholder={t('profile.grewUpHint')}
            onPress={() => setDetailPicker('grewUp')}
          />
          <PickerSheet
            visible={detailPicker === 'grewUp'}
            groups={heritageGroups(language, false)}
            selected={grewUp}
            selectionMode="multiple"
            maxSelected={GREW_UP_MAX}
            onChange={(next) => { setGrewUp(next); setOwnDirty(true); }}
            onClose={() => setDetailPicker(null)}
            title={t('profile.grewUp')}
            eyebrow={t('profile.grewUpHint')}
            searchLabel={t('profile.heritageSearch')}
          />
        </View>

        <View style={styles.profileChoice}>
          <Text variant="micro">{t('profile.diet')}</Text>
          <Text variant="caption" style={styles.choiceNote}>{t('profile.dietHint')}</Text>
          <View style={[styles.formRow, isRTL && styles.rowRTL, { flexWrap: 'wrap', gap: 8 }]}>
            {DIETS.map((option) => (
              <Chip
                key={option}
                label={t(DIET_KEYS[option])}
                selected={diet.includes(option)}
                showMark
                onPress={() => { setDiet(toggleDiet(diet, option)); setOwnDirty(true); }}
              />
            ))}
          </View>
        </View>

        <View ref={(target) => setChecklistTarget('body', target)} collapsable={false} style={styles.profileChoice}>
          <Text variant="micro">{t('filters.yourTitle')}</Text>
          <Text variant="caption" style={styles.choiceNote}>{t('filters.yourBody')}</Text>
          <View ref={(target) => setChecklistTarget('height', target)} collapsable={false} style={[styles.formRow, isRTL && styles.rowRTL]}>
            <Field
              label={t('filters.yourHeight')}
              keyboardType="number-pad"
              value={ownHeight}
              onChangeText={(text) => { setOwnHeight(text.replace(/\D/g, '')); setOwnDirty(true); }}
            />
            <Field
              label={t('filters.yourWeight')}
              keyboardType="number-pad"
              value={ownWeight}
              onChangeText={(text) => { setOwnWeight(text.replace(/\D/g, '')); setOwnDirty(true); }}
            />
          </View>
          <View ref={(target) => setChecklistTarget('bodyType', target)} collapsable={false}>
            <SelectField
              label={t('filters.yourBodyType')}
              value={ownBuilds.map((build) => buildLabel(build as (typeof BUILD_OPTIONS)[number], t)).join(', ')}
              placeholder={t('filters.yourBodyType')}
              onPress={() => setBuildPicker(true)}
            />
          </View>
          <PickerSheet
            visible={buildPicker}
            groups={buildGroups(t)}
            selected={ownBuilds}
            selectionMode="multiple"
            maxSelected={OWN_BUILD_MAX}
            onChange={(next) => { setOwnBuilds(next); setOwnDirty(true); }}
            onClose={() => setBuildPicker(false)}
            title={t('filters.yourBodyType')}
            eyebrow={t('filters.privateTitle')}
            searchLabel={t('filters.bodyTypes')}
          />
        </View>
      </Card>
      </View>


      <PhotoCropSheet
        shape="card"
        uri={cropping?.uri ?? null}
        onDone={(uri) => void saveCropped(uri)}
        onCancel={() => setCropping(null)}
      />
      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={t('profile.removeTitle')}
        body={t('profile.removeBody')}
        confirmLabel={t('profile.removePhoto')}
        cancelLabel={t('profile.keepPhoto')}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
      {save.isError ? (
        <Text accessibilityRole="alert" variant="caption" style={styles.saveError}>
          {errorMessage(save.error, t, 'profile.saveError')}
        </Text>
      ) : null}
    </View>
  );
}

function splitProfileList(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 8);
}

const FAMILY_CHOICES: [Profile['familyGoals'], TranslationKey][] = [
  ['wants_children_soon', 'filters.children.soon'],
  ['wants_children_later', 'filters.children.later'],
  ['open_to_children', 'filters.children.open'],
  ['no_children', 'filters.children.none'],
];

/** Marks a label as one the member must fill in. */
function required(label: string): string {
  return `${label} *`;
}

/** Older profiles stored typed names ("Arabic, Urdu"); keep what maps to a code. */
function languageCodes(stored: string[]): string[] {
  return [...new Set(stored.map((value) => languageCodeFor(value)).filter((code): code is string => Boolean(code)))];
}

/** The sect groups, plus "prefer not to say", which on a profile is a real answer. */
function profileSectGroups(t: Translate): CatalogGroup[] {
  const unstated = t('filters.sect.unstated');
  return [
    ...SECT_GROUPS,
    {
      id: 'group:unstated',
      en: unstated,
      ar: unstated,
      t: {},
      options: [{ id: 'prefer_not_to_say', en: unstated, ar: unstated, t: {} }],
    },
  ];
}

function sectChoiceLabel(id: string, language: Parameters<typeof optionLabel>[1], t: Translate): string {
  for (const group of profileSectGroups(t)) {
    const option = group.options.find((entry) => entry.id === id);
    if (option) return optionLabel(option, language);
  }
  return id;
}


function practiceLabel(value: ReligiousPractice, t: Translate): string {
  const keys: Record<ReligiousPractice, 'filters.practice.very' | 'filters.practice.practicing' | 'filters.practice.moderate' | 'filters.practice.learning'> = {
    very_practicing: 'filters.practice.very',
    practicing: 'filters.practice.practicing',
    moderate: 'filters.practice.moderate',
    learning: 'filters.practice.learning',
  };
  return t(keys[value]);
}

function timelineLabel(value: MarriageTimeline, t: Translate): string {
  const keys: Record<MarriageTimeline, 'filters.timeline.3m' | 'filters.timeline.6m' | 'filters.timeline.1y' | 'filters.timeline.2y'> = {
    within_3_months: 'filters.timeline.3m',
    within_6_months: 'filters.timeline.6m',
    within_1_year: 'filters.timeline.1y',
    '1_to_2_years': 'filters.timeline.2y',
  };
  return t(keys[value]);
}

function showPermissionRecovery(
  canAskAgain: boolean,
  t: Translate,
  title: string,
  body: string
) {
  if (canAskAgain || Platform.OS === 'web') {
    showNotice(title, body);
    return;
  }
  Alert.alert(title, body, [
    { text: t('settings.notNow'), style: 'cancel' },
    {
      text: t('common.openSettings'),
      onPress: () => { void Linking.openSettings().catch(() => {}); },
    },
  ]);
}
