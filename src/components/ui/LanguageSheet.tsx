import { useMemo } from 'react';

import { PickerSheet } from '@/components/ui/PickerSheet';
import type { CatalogGroup } from '@/data/catalogOption';
import { useI18n } from '@/i18n';
import { isSupportedLocale, localeName, supportedLocales } from '@/i18n/locales';
import { useSession } from '@/state/session';

/**
 * Every language the app speaks, each named in its own language so anyone can
 * find theirs whatever the screen is currently in.
 */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { language, setLanguage } = useSession();

  const groups = useMemo<readonly CatalogGroup[]>(() => {
    const heading = t('settings.language');
    return [{
      id: 'languages',
      en: heading,
      ar: heading,
      t: Object.fromEntries(supportedLocales.map((code) => [code, heading])),
      options: supportedLocales.map((code) => {
        const name = localeName(code);
        return { id: code, en: name, ar: name, t: Object.fromEntries(supportedLocales.map((c) => [c, name])) };
      }),
    }];
  }, [t]);

  return (
    <PickerSheet
      visible={visible}
      groups={groups}
      selected={[language]}
      selectionMode="single"
      onChange={(next) => {
        const chosen = next[0];
        if (isSupportedLocale(chosen)) setLanguage(chosen);
      }}
      onClose={onClose}
      title={t('settings.language')}
      eyebrow={t('settings.preferences')}
      searchLabel={t('settings.searchLanguages')}
    />
  );
}
