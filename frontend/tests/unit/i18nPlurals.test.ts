import { readFileSync } from 'fs';
import i18next from 'i18next';
import { join } from 'path';

const LOCALES = ['en', 'es', 'fr', 'ko', 'ru', 'uk', 'zh'];
const PLURAL = /_(zero|one|two|few|many|other)$/;

const load = (lng: string): Record<string, string> =>
  JSON.parse(
    readFileSync(join(__dirname, '../../app/locales', `${lng}.json`), 'utf8'),
  );

describe('locale plural forms', () => {
  it.each(LOCALES)('%s has every category its plural rules need', (lng) => {
    const data = load(lng);
    const needed = new Intl.PluralRules(lng).resolvedOptions().pluralCategories;
    const bases = new Set(
      Object.keys(load('en'))
        .filter((k) => PLURAL.test(k))
        .map((k) => k.replace(PLURAL, '')),
    );
    expect(bases.size).toBeGreaterThan(0);
    const missing = [...bases].flatMap((base) =>
      needed.filter((c) => !(`${base}_${c}` in data)).map((c) => `${base}_${c}`),
    );
    expect(missing).toEqual([]);
  });

  it('picks the Russian form by count', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'ru',
      fallbackLng: 'en',
      resources: {
        en: { translation: load('en') },
        ru: { translation: load('ru') },
      },
      interpolation: { escapeValue: false },
    });
    const forms = [1, 2, 5].map((count) =>
      i18n.t('{{n}} sessions', { count, n: String(count) }),
    );
    forms.forEach((f, i) => expect(f).toContain(String([1, 2, 5][i])));
    expect(new Set(forms.map((f) => f.replace(/\d+/, ''))).size).toBe(3);
  });

  it('keeps the English singular for one', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: { en: { translation: load('en') } },
      interpolation: { escapeValue: false },
    });
    expect(i18n.t('{{n}} sessions', { count: 1, n: '1' })).toBe('1 session');
    expect(i18n.t('{{n}} sessions', { count: 3, n: '3' })).toBe('3 sessions');
  });
});
