import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fetchMyProfile, setMyPreferredSects, setMyPremiumPreferences, updateMyPreferences } from '@/api/profile';
import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/AsyncState';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { SelectField } from '@/components/ui/SelectField';
import { Slider } from '@/components/ui/Slider';
import { Text } from '@/components/ui/Text';
import { MustHaveToggle } from '@/components/you/MustHaveToggle';
import { CountrySheet } from '@/components/you/CountrySheet';
import { useI18n, type Translate } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import {
  BUILD_OPTIONS,
  DISTANCE_RANGE,
  HEIGHT_RANGE,
  AGE_RANGE,
  FAMILY_GOAL_LABELS,
  PRACTICE_LABELS,
  RADIUS_PRESETS,
  TIMELINE_LABELS,
  formatHeightImperial,
} from '@/data/preferences';
import type { CatalogGroup } from '@/data/catalogOption';
import { optionLabel } from '@/data/catalogOption';
import { SECT_GROUPS, isSectDetail, sectOf } from '@/data/sects';
import { EDUCATION_GROUPS } from '@/data/educationLevels';
import { OCCUPATION_GROUPS } from '@/data/occupations';
import { LANGUAGE_GROUPS } from '@/data/spokenLanguages';
import { HAS_CHILDREN_OPTIONS, asGroups, dressOptions } from '@/data/matchingOptions';
import { ETHNICITY_GROUPS } from '@/data/ethnicities';
import { showNotice } from '@/lib/notice';
import { useSession } from '@/state/session';
import { alpha, color, font, radius } from '@/theme/tokens';
import { queryKeys } from '@/lib/queryClient';
import type {
  FamilyGoals,
  MarriageTimeline,
  MustHaveCriterion,
  PremiumCriterion,
  PrivatePreferences,
  ReligiousPractice,
  Sect,
} from '@/types';
import { RTL_LAYOUT } from '@/lib/rtl';
import { errorMessage } from '@/lib/errorMessage';
import { useToast } from '@/state/toast';


/**
 * The private preference editor.
 *
 * Two halves: what you are looking for, and your own figures. Neither is ever
 * rendered on a profile or sent to another member — the copy says so twice
 * because this is the part of the product that most needs to be trusted.
 */
export function PrivateTab({ preferences }: { preferences: PrivatePreferences }) {
  const { t, isRTL, language } = useI18n();
  const [picking, setPicking] = useState<'builds' | 'sects' | null>(null);
  const [premiumPicking, setPremiumPicking] = useState<PremiumCriterion | null>(null);
  const [draft, setDraft] = useState(preferences);
  const [countrySheet, setCountrySheet] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const queryClient = useQueryClient();
  const isPremium = useSession().tier === 'premium';
  // Dress options are the other side's: a woman filters by men's options.
  const meQuery = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile });
  const partnerGender = meQuery.data?.gender === 'female' ? 'male' : 'female';
  const toast = useToast();

  const save = useMutation({
    mutationFn: async () => {
      await updateMyPreferences(draft);
      await setMyPreferredSects(draft.preferredSects ?? [], draft.preferredSectDetails ?? []);
      if (isPremium) await setMyPremiumPreferences(draft);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileReadiness });
      void queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
      toast.show(`✓ ${t('filters.saved')}`);
    },
  });

  const setMustHave = (criterion: MustHaveCriterion, next: boolean) =>
    setDraft((current) => ({
      ...current,
      mustHave: { ...current.mustHave, [criterion]: next },
    }));

  const mustHaveFor = (criterion: MustHaveCriterion) => (
    <MustHaveToggle
      criterion={criterion}
      value={draft.mustHave?.[criterion] ?? false}
      onChange={(next) => setMustHave(criterion, next)}
    />
  );

  const patch = <K extends keyof PrivatePreferences>(
    key: K,
    value: PrivatePreferences[K]
  ) => setDraft((current) => ({ ...current, [key]: value }));


  type PremiumList = 'preferredHasChildren' | 'preferredOccupations' | 'preferredLanguages'
    | 'preferredEducation' | 'preferredDress' | 'preferredEthnicities';

  const toggleIn = (key: PremiumList, id: string) =>
    setDraft((current) => {
      const list = current[key] ?? [];
      return { ...current, [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] };
    });

  const premiumMustHaveFor = (criterion: PremiumCriterion) => (
    <MustHaveToggle
      criterion={criterion}
      value={draft.premiumMustHave?.[criterion] ?? false}
      onChange={(next) =>
        setDraft((current) => ({
          ...current,
          premiumMustHave: { ...current.premiumMustHave, [criterion]: next },
        }))
      }
    />
  );

  /** A multi-choice Premium filter: a dropdown, its list, and its must-have. */
  const premiumPicker = (
    criterion: PremiumCriterion,
    label: string,
    groups: readonly CatalogGroup[],
    key: PremiumList,
  ) => {
    const chosen = draft[key] ?? [];
    return (
      <View style={styles.section}>
        <SelectField
          label={label}
          value={chosen
            .map((id) => {
              const option = groups.flatMap((group) => group.options).find((entry) => entry.id === id);
              return option ? optionLabel(option, language) : id;
            })
            .join(', ')}
          placeholder={t('filters.any')}
          onPress={() => setPremiumPicking(criterion)}
        />
        <PickerSheet
          visible={premiumPicking === criterion}
          groups={groups}
          selected={chosen}
          selectionMode="multiple"
          onChange={(next) => setDraft((current) => ({ ...current, [key]: next }))}
          onClose={() => setPremiumPicking(null)}
          title={label}
          eyebrow={t('filters.premiumTitle')}
          searchLabel={label}
        />
        {premiumMustHaveFor(criterion)}
      </View>
    );
  };

  const toggleListValue = <T extends string>(
    key: 'preferredPractice' | 'desiredTimeline' | 'desiredFamilyGoals' | 'preferredSects',
    value: T
  ) => {
    const current = (draft[key] ?? []) as T[];
    patch(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as never);
  };

  const clearMatchingChoices = () => {
    setDraft((current) => ({
      ...current,
      minAge: AGE_RANGE.min,
      maxAge: AGE_RANGE.max,
      minHeightCm: HEIGHT_RANGE.min,
      maxHeightCm: HEIGHT_RANGE.max,
      preferredBuilds: [],
      preferredCountries: [],
      maxDistanceKm: DISTANCE_RANGE.max,
      preferredPractice: [],
      desiredTimeline: [],
    }));
    setClearConfirm(false);
  };

  return (
    <View style={[styles.wrap, isRTL && styles.rtl]}>

      {(
        <Card style={styles.card}>
          <View>
            <Text variant="microAccent">{t('filters.tab.partner')}</Text>
            <Text variant="displaySmall" style={styles.sectionTitle}>
              {t('filters.partnerTitle')}
            </Text>
            <Text variant="caption" style={styles.sectionBody}>
              {t('filters.partnerBody')}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={[styles.sectionHead, isRTL && styles.rowReverse]}>
              <Text variant="micro">{t('filters.ageRange')}</Text>
              <Text variant="caption">
                {t('filters.yearsRange', { min: draft.minAge, max: draft.maxAge })}
              </Text>
            </View>
            <RangeSlider
              min={AGE_RANGE.min}
              max={AGE_RANGE.max}
              value={[draft.minAge, draft.maxAge]}
              onChange={([low, high]) => {
                patch('minAge', low);
                patch('maxAge', high);
              }}
              lowAccessibilityLabel={t('filters.minimumAge')}
              highAccessibilityLabel={t('filters.maximumAge')}
            />
            {mustHaveFor('age')}
          </View>

          <View style={styles.section}>
            <View style={[styles.sectionHead, isRTL && styles.rowReverse]}>
              <Text variant="micro">
                {t('filters.heightRange', { min: draft.minHeightCm, max: draft.maxHeightCm })}
              </Text>
              <Text variant="label" style={styles.sectionValue}>
                {formatHeightImperial(draft.minHeightCm)} –{' '}
                {formatHeightImperial(draft.maxHeightCm)}
              </Text>
            </View>
            <RangeSlider
              min={HEIGHT_RANGE.min}
              max={HEIGHT_RANGE.max}
              value={[draft.minHeightCm, draft.maxHeightCm]}
              onChange={([low, high]) => {
                patch('minHeightCm', low);
                patch('maxHeightCm', high);
              }}
              lowAccessibilityLabel={t('filters.minimumHeight')}
              highAccessibilityLabel={t('filters.maximumHeight')}
            />
            {mustHaveFor('height')}
          </View>

          <View style={styles.section}>
            <Text variant="micro">{t('filters.locationDistance')}</Text>
            <View style={styles.radiusPanel}>
              <View style={[styles.radiusHead, isRTL && styles.rowReverse]}>
                <View style={styles.radiusText}>
                  <Text variant="label" style={styles.radiusTitle}>
                    {t('filters.searchDistance')}
                  </Text>
                  <Text variant="caption">{t('filters.searchDistanceBody')}</Text>
                </View>
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillLabel}>
                    {t('filters.distanceKm', { count: draft.maxDistanceKm })}
                  </Text>
                </View>
              </View>

              <Slider
                accessibilityLabel={t('filters.maxDistanceA11y')}
                min={DISTANCE_RANGE.min}
                max={DISTANCE_RANGE.max}
                step={5}
                value={draft.maxDistanceKm}
                onChange={(value) => patch('maxDistanceKm', value)}
              />

              <View style={styles.chips}>
                {RADIUS_PRESETS.map((preset) => (
                  <Chip
                    key={preset}
                    label={t('filters.distanceKm', { count: preset })}
                    selected={draft.maxDistanceKm === preset}
                    onPress={() => patch('maxDistanceKm', preset)}
                  />
                ))}
              </View>
              {mustHaveFor('distance')}
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.sectionHead, isRTL && styles.rowReverse]}>
              <Text variant="micro">{t('filters.countries')}</Text>
              <Text variant="caption">
                {t('filters.selected', { count: draft.preferredCountries.length })}
              </Text>
            </View>
            <View style={styles.chips}>
              {draft.preferredCountries.slice(0, 6).map((country) => (
                <Chip
                  key={country}
                  label={country}
                  selected
                  showMark
                  onPress={() =>
                    patch(
                      'preferredCountries',
                      draft.preferredCountries.filter((item) => item !== country)
                    )
                  }
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('filters.chooseCountries')}
              onPress={() => setCountrySheet(true)}
              style={[styles.sheetTrigger, isRTL && styles.rowReverse]}
            >
              <Text variant="label" style={styles.sheetTriggerLabel}>
                {t('filters.chooseCountries')}
              </Text>
              <Text style={styles.sheetTriggerArrow}>→</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SelectField
              label={t('filters.sect')}
              value={sectSelection(draft).map((id) => sectName(id, language)).join(', ')}
              placeholder={t('filters.sectPlaceholder')}
              onPress={() => setPicking('sects')}
            />
            <PickerSheet
              visible={picking === 'sects'}
              groups={SECT_GROUPS}
              selected={sectSelection(draft)}
              selectionMode="multiple"
              onChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  preferredSects: [...new Set(next.map(sectOf).filter((sect): sect is Exclude<Sect, 'prefer_not_to_say'> => Boolean(sect)))],
                  preferredSectDetails: next.filter(isSectDetail),
                }))
              }
              onClose={() => setPicking(null)}
              title={t('filters.sect')}
              eyebrow={t('filters.sectPlaceholder')}
              searchLabel={t('filters.sect')}
            />
            <Text variant="caption" style={styles.filterNote}>
              {t('filters.sectBody')}
            </Text>
            {mustHaveFor('sect')}
          </View>

          {/* Everything below is Premium. Shown to everyone, so a free member
              can see what it offers; only a Premium member can change it. */}
          <View style={styles.premiumHead}>
            <Text variant="microAccent">✦ {t('filters.premiumTitle')}</Text>
            <Text variant="caption" style={styles.filterNote}>{t('filters.premiumBody')}</Text>
          </View>
          <View style={styles.premiumBlock}>
            <View style={[styles.premiumInner, !isPremium && styles.locked]} pointerEvents={isPremium ? 'auto' : 'none'}>
          <View style={styles.section}>
            <SelectField
              label={t('filters.bodyTypes')}
              value={draft.preferredBuilds
                .map((build) => buildLabel(build as (typeof BUILD_OPTIONS)[number], t))
                .join(', ')}
              placeholder={t('filters.bodyTypesPlaceholder')}
              onPress={() => setPicking('builds')}
            />
            <PickerSheet
              visible={picking === 'builds'}
              groups={buildGroups(t)}
              selected={draft.preferredBuilds}
              selectionMode="multiple"
              maxSelected={3}
              onChange={(next) => patch('preferredBuilds', next)}
              onClose={() => setPicking(null)}
              title={t('filters.bodyTypes')}
              eyebrow={t('filters.bodyTypesPlaceholder')}
              searchLabel={t('filters.bodyTypes')}
            />
            {mustHaveFor('build')}
          </View>

          <View style={styles.section}>
            <Text variant="micro">{t('filters.practice')}</Text>
            <Text variant="caption" style={styles.filterNote}>
              {t('filters.practiceBody')}
            </Text>
            <View style={styles.checkList}>
              {(Object.entries(PRACTICE_LABELS) as [ReligiousPractice, string][]).map(
                ([value]) => (
                  <FilterCheck
                    key={value}
                    label={practiceLabel(value, t)}
                    checked={draft.preferredPractice.includes(value)}
                    onPress={() => toggleListValue('preferredPractice', value)}
                  />
                )
              )}
            </View>
            {mustHaveFor('practice')}
          </View>

          <View style={styles.section}>
            <Text variant="micro">{t('filters.marriageTiming')}</Text>
            <Text variant="caption" style={styles.filterNote}>
              {t('filters.marriageTimingBody')}
            </Text>
            <View style={styles.checkList}>
              {(Object.entries(TIMELINE_LABELS) as [MarriageTimeline, string][]).map(
                ([value]) => (
                  <FilterCheck
                    key={value}
                    label={timelineLabel(value, t)}
                    checked={draft.desiredTimeline.includes(value)}
                    onPress={() => toggleListValue('desiredTimeline', value)}
                  />
                )
              )}
            </View>
            {mustHaveFor('timeline')}
          </View>

          <View style={styles.section}>
            <Text variant="micro">{t('filters.hasChildren')}</Text>
            <View style={styles.chips}>
              {HAS_CHILDREN_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={optionLabel(option, language)}
                  selected={(draft.preferredHasChildren ?? []).includes(option.id)}
                  onPress={() => toggleIn('preferredHasChildren', option.id)}
                  showMark
                />
              ))}
            </View>
            {premiumMustHaveFor('has_children')}
            <Text variant="micro" style={styles.subHeading}>{t('filters.childrenTimeframe')}</Text>
            <Text variant="caption" style={styles.filterNote}>
              {t('filters.childrenBody')}
            </Text>
            <View style={styles.checkList}>
              {(Object.entries(FAMILY_GOAL_LABELS) as [FamilyGoals, string][]).map(
                ([value]) => (
                  <FilterCheck
                    key={value}
                    label={familyGoalLabel(value, t)}
                    checked={(draft.desiredFamilyGoals ?? []).includes(value)}
                    onPress={() => toggleListValue('desiredFamilyGoals', value)}
                  />
                )
              )}
            </View>
            {mustHaveFor('children')}
          </View>
          {premiumPicker('occupations', t('filters.career'), OCCUPATION_GROUPS, 'preferredOccupations')}
          {premiumPicker('languages', t('filters.languages'), LANGUAGE_GROUPS, 'preferredLanguages')}
          {premiumPicker('education', t('filters.education'), EDUCATION_GROUPS, 'preferredEducation')}
          {premiumPicker('dress', t('filters.dress'), asGroups(t('filters.dress'), dressOptions(partnerGender)), 'preferredDress')}
          {premiumPicker('ethnicities', t('filters.ethnicity'), ETHNICITY_GROUPS, 'preferredEthnicities')}
            </View>
            {!isPremium ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('filters.premiumTitle')}
                onPress={() => showNotice(t('filters.premiumTitle'), t('filters.premiumBody'))}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>



          <Button
            label={t('filters.clear')}
            variant="secondary"
            onPress={() => setClearConfirm(true)}
          />

          <Button
            label={save.isSuccess ? t('filters.saved') : t('filters.savePartner')}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
          {save.isError ? <InlineNotice message={errorMessage(save.error, t, 'filters.saveError')} /> : null}
        </Card>
      )}

      <CountrySheet
        visible={countrySheet}
        selected={draft.preferredCountries}
        onChange={(next) => patch('preferredCountries', next)}
        onClose={() => setCountrySheet(false)}
      />

      <ConfirmDialog
        visible={clearConfirm}
        title={t('filters.clearTitle')}
        body={t('filters.clearBody')}
        confirmLabel={t('filters.clearConfirm')}
        cancelLabel={t('filters.clearCancel')}
        onConfirm={clearMatchingChoices}
        onCancel={() => setClearConfirm(false)}
      />
    </View>
  );
}

function FilterCheck({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const { isRTL } = useI18n();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.checkRow, isRTL && styles.rowReverse, checked && styles.checkRowSelected]}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxSelected]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const BUILD_KEYS: Record<(typeof BUILD_OPTIONS)[number], TranslationKey> = {
  Petite: 'filters.build.petite',
  Slim: 'filters.build.slim',
  Slender: 'filters.build.slender',
  Lean: 'filters.build.lean',
  'Tall & Lean': 'filters.build.tallLean',
  Average: 'filters.build.average',
  'Fit / Active': 'filters.build.fit',
  Athletic: 'filters.build.athletic',
  Toned: 'filters.build.toned',
  Muscular: 'filters.build.muscular',
  'Medium / Solid': 'filters.build.solid',
  Curvy: 'filters.build.curvy',
  'Full-Figured': 'filters.build.full',
  'Plus Size': 'filters.build.plus',
  Broad: 'filters.build.broad',
  Stocky: 'filters.build.stocky',
  'Robust / Sturdy': 'filters.build.sturdy',
};

const PRACTICE_KEYS: Record<ReligiousPractice, TranslationKey> = {
  very_practicing: 'filters.practice.very',
  practicing: 'filters.practice.practicing',
  moderate: 'filters.practice.moderate',
  learning: 'filters.practice.learning',
};

const FAMILY_GOAL_KEYS: Record<FamilyGoals, TranslationKey> = {
  wants_children_soon: 'filters.children.soon',
  wants_children_later: 'filters.children.later',
  open_to_children: 'filters.children.open',
  no_children: 'filters.children.none',
};

/**
 * 'prefer_not_to_say' is intentionally absent: it is what someone declares
 * about themselves, not something anyone can require of a partner. In matching
 * it is compatible with every preference.
 */
/**
 * What the sect picker shows as chosen: each tradition, plus any sect chosen
 * on its own (one with no tradition picked under it).
 */
function sectSelection(preferences: PrivatePreferences): string[] {
  const details = preferences.preferredSectDetails ?? [];
  const broad = (preferences.preferredSects ?? []).filter(
    (sect) => !details.some((detail) => sectOf(detail) === sect),
  );
  return [...broad, ...details];
}

function sectName(id: string, language: Parameters<typeof optionLabel>[1]): string {
  for (const group of SECT_GROUPS) {
    const option = group.options.find((entry) => entry.id === id);
    if (option) return optionLabel(option, language);
  }
  return id;
}

/** Body types as a one-group list; labels are already in the reader's language. */
export function buildGroups(t: Translate): CatalogGroup[] {
  return [{
    id: 'builds',
    en: t('filters.bodyTypes'),
    ar: t('filters.bodyTypes'),
    t: {},
    options: BUILD_OPTIONS.map((build) => {
      const label = buildLabel(build, t);
      return { id: build, en: label, ar: label, t: {} };
    }),
  }];
}


const TIMELINE_KEYS: Record<MarriageTimeline, TranslationKey> = {
  within_3_months: 'filters.timeline.3m',
  within_6_months: 'filters.timeline.6m',
  within_1_year: 'filters.timeline.1y',
  '1_to_2_years': 'filters.timeline.2y',
};

export function buildLabel(value: (typeof BUILD_OPTIONS)[number], t: Translate): string {
  return t(BUILD_KEYS[value]);
}

function practiceLabel(value: ReligiousPractice, t: Translate): string {
  return t(PRACTICE_KEYS[value]);
}

function familyGoalLabel(value: FamilyGoals, t: Translate): string {
  return t(FAMILY_GOAL_KEYS[value]);
}


function timelineLabel(value: MarriageTimeline, t: Translate): string {
  return t(TIMELINE_KEYS[value]);
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  wrap: { gap: 12, paddingBottom: 24 },
  card: { gap: 18 },

  sectionTitle: { marginTop: 8 },
  sectionBody: { marginTop: 6 },

  section: {
    borderTopWidth: 1,
    borderTopColor: alpha.lineFaint,
    paddingTop: 16,
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  sectionValue: { fontSize: 11 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterNote: { marginTop: -5 },
  checkList: { gap: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    backgroundColor: color.surface,
  },
  checkRowSelected: { borderColor: color.ink, backgroundColor: color.sandLight },
  checkBox: {
    width: 19,
    height: 19,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: alpha.lineButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxSelected: { backgroundColor: color.ink, borderColor: color.ink },
  checkMark: { fontFamily: font.bodyBold, fontSize: 12, color: color.white },
  checkLabel: { flex: 1, fontFamily: font.bodyMedium, fontSize: 12.5, color: color.ink },

  radiusPanel: {
    backgroundColor: color.sandLight,
    borderRadius: radius.xl,
    padding: 16,
    gap: 10,
  },
  radiusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  radiusText: { gap: 3, flex: 1 },
  radiusTitle: { fontSize: 12 },
  radiusPill: {
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  radiusPillLabel: { fontFamily: font.bodyBold, fontSize: 10, color: color.white },

  sheetTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sheetTriggerLabel: { fontSize: 12 },
  sheetTriggerArrow: { fontFamily: font.body, color: color.faint },

  confidentialTitle: {
    fontFamily: font.bodyBold,
    fontSize: 11.5,
    color: color.gold,
  },
  confidentialBody: { marginTop: 6, color: color.muted },

  metricRow: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, gap: 6 },
  premiumHead: { gap: 4, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: alpha.lineFaint },
  premiumBlock: { position: 'relative' },
  premiumInner: { gap: 22 },
  locked: { opacity: 0.45 },
  subHeading: { marginTop: 12 },
  missing: { borderColor: '#B3261E', borderWidth: 1.5 },
  missingGroup: { borderWidth: 1.5, borderColor: '#B3261E', borderRadius: radius.md, padding: 6 },
  missingText: { color: '#B3261E', fontFamily: font.bodyBold },
  metricInput: {
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily: font.body,
    fontSize: 12.5,
    color: color.ink,
    backgroundColor: color.surface,
  },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
