import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { declarableStatuses, MARITAL_STATUS_KEYS } from '@/data/marital';
import { normaliseDecimalDigits } from '@/lib/birthDate';
import { styles } from './styles';
import type { StepProps } from './types';
import { StepHeading, DatePart, InlineError } from './fields';

export function BasicDetailsStep({ draft, errors, patch }: StepProps) {
  const { t, isRTL } = useI18n();
  // A full day moves on to the month, a full month to the year, the way a
  // date is typed on paper. Without it every member tapped three boxes.
  const monthInput = useRef<TextInput>(null);
  const yearInput = useRef<TextInput>(null);
  return (
    <View>
      <StepHeading
        title={t('onboarding.detailsTitle')}
        body={t('onboarding.detailsBody')}
      />
      <View style={styles.form}>
        <View style={styles.datePanel}>
          <Text variant="label">{t('onboarding.birthDate')}</Text>
          <Text variant="caption" style={styles.dateHint}>{t('onboarding.birthDateHint')}</Text>
          <View style={[styles.dateRow, isRTL && styles.rowReverse]}>
            <DatePart
              kind="day"
              label={t('onboarding.day')}
              value={draft.birthDay}
              maxLength={2}
              onChangeText={(value) => {
                const digits = normaliseDecimalDigits(value);
                patch('birthDay', digits);
                if (digits.length === 2) monthInput.current?.focus();
              }}
            />
            <DatePart
              kind="month"
              label={t('onboarding.month')}
              value={draft.birthMonth}
              maxLength={2}
              inputRef={monthInput}
              onChangeText={(value) => {
                const digits = normaliseDecimalDigits(value);
                patch('birthMonth', digits);
                if (digits.length === 2) yearInput.current?.focus();
              }}
            />
            <DatePart
              kind="year"
              label={t('onboarding.year')}
              value={draft.birthYear}
              maxLength={4}
              inputRef={yearInput}
              onChangeText={(value) => patch('birthYear', normaliseDecimalDigits(value))}
            />
          </View>
        </View>
        {errors.birthDate ? <InlineError message={errors.birthDate} /> : null}

        <View style={styles.genderBlock}>
          <Text variant="label">{t('onboarding.gender')}</Text>
          <Text variant="caption">{t('onboarding.genderBody')}</Text>
          <View style={[styles.genderRow, isRTL && styles.rowReverse]}>
            {(['female', 'male'] as const).map((option) => {
              const selected = draft.gender === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => patch('gender', option)}
                  style={[styles.genderOption, selected && styles.genderOptionSelected]}
                >
                  <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                    {option === 'female' ? t('onboarding.woman') : t('onboarding.man')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.gender ? <InlineError message={errors.gender} /> : null}
        </View>

        {draft.gender ? (
          <View style={styles.genderBlock}>
            <Text variant="label">{t('onboarding.marital')}</Text>
            <Text variant="caption">{t('onboarding.maritalBody')}</Text>
            <View style={styles.maritalGrid}>
              {declarableStatuses(draft.gender).map((option) => {
                const selected = draft.maritalStatus === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => patch('maritalStatus', option)}
                    style={[styles.genderOption, styles.maritalOption, selected && styles.genderOptionSelected]}
                  >
                    <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                      {t(MARITAL_STATUS_KEYS[option])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.maritalStatus ? <InlineError message={errors.maritalStatus} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
