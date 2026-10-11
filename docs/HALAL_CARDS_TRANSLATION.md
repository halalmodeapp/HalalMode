# Halal Cards — translation guide

Halal Cards (Relationship Lab, Quizzes, Adventures and the Shared Journal) is
written in English. This guide is for translating it into the app's other
fifteen languages so it reads as if it had been written in each of them.

## Files

- **Source:** `docs/halal-cards-strings.en.json` — every member-facing string,
  in two groups: `copy` (buttons, labels, short interface lines) and `content`
  (the lessons, quizzes and stories). Regenerate it with `npm run cards:strings`
  whenever the English changes.
- **Translation:** `src/halalCards/translations/<code>.json`, with exactly the
  same two groups and exactly the same keys. Codes: `ar`, `ur`, `fa`, `hi`,
  `id`, `ms`, `bn`, `fr`, `tr`, `ha`, `am`, `so`, `es`, `ru`, `zh-Hans`.
- **Check:** `npm run cards:strings` reports missing keys, unknown keys and
  changed placeholders for every translation file, and fails if any are wrong.
  The test suite (`npm test`) checks the same.
- **Switching a language on:** add one line to
  `src/halalCards/translations/index.ts` —
  `ar: require('./ar.json') as CardsTranslation,` — only once the check passes.
  From then on Halal Cards appears fully in that language, in its own
  direction. Until then, members using it see English.

## Hard rules

1. **Never change a key.** Translate values only. Do not add, remove, rename or
   reorder keys.
2. **Keep every `{{placeholder}}` exactly**, e.g. `{{name}}`, `{{count}}`,
   `{{role}}`, `{{title}}`. Move it wherever the grammar needs it, but keep the
   braces and the word inside them unchanged.
3. **Keep emojis and symbols** (🙂, ✓, ✦, 💬, ›) where they appear.
4. **One string, one string.** Don't merge or split entries; each is shown on
   its own.
5. **Keep it short.** Buttons and labels have little room. Aim for no more than
   about 30% longer than the English for anything in `copy`, and for choice
   labels in `content`.
6. **No contact details, links or brand names** that are not in the source.

## Voice

The English has a deliberate voice. Match the feeling, not the words.

- **Warm, plain and adult.** Write the way a kind, wise older sibling would talk
  to a couple — never like a textbook, a sermon or an app trying to sell
  something.
- **Short sentences.** Prefer two short sentences to one long one.
- **Not preachy.** Faith is natural and present, never lectured. Do not add
  religious phrases that are not in the source, and do not remove the ones that
  are.
- **Shows, doesn't grade.** Consequences describe what happens; they don't
  scold. Keep that restraint.
- **Second person** in prompts and lessons ("What do you say?"), the same
  as the English.
- **Respectful but not stiff.** Use the respectful/formal "you" where your
  language expects it between adults (e.g. *vous* in French, *Anda* in
  Indonesian, *Sie*-style forms) unless the English is clearly intimate between
  spouses inside a story.
- **Gender:** stories have named husbands and wives — follow their grammatical
  gender. Interface copy addresses either member; where your language forces a
  gender, prefer a neutral construction over guessing.

## Names and Islamic terms

- **Character names** (Hamza, Noor, Yusuf, Maryam…) stay the same people:
  transliterate them into your script if it isn't Latin (Arabic, Urdu, Persian,
  Hindi, Bengali, Amharic, Russian, Chinese), and leave them as they are in
  Latin-script languages.
- **"Halal Cards"** stays "Halal Cards" in Latin-script languages. In other
  scripts, use the same transliteration as the app's notification wording
  (e.g. Arabic بطاقات حلال, Urdu حلال کارڈز, Persian کارت‌های حلال, Hindi
  हलाल कार्ड्स, Bengali হালাল কার্ডস, Amharic ሃላል ካርድስ).
- **Islamic terms** — Fajr, Isha, iftar, suhoor, tarawih, Ramadan, Eid, nikah,
  mahr, wali, walimah, istikhara, du’a, halaqa, juz, masjid, Qur’an, deen,
  barakah, sadaqah, Umrah, Hajj, Laylat al-Qadr ("the twenty-seventh night") —
  use the form Muslims who speak your language actually use (e.g. Arabic
  الفجر, Turkish *sabah namazı* for Fajr where natural, Malay *Subuh*,
  Indonesian *Subuh*, Urdu فجر). Do not explain them.
- **"Rule Zero", "Rule 1"…** are labels for the four workshops. Translate
  naturally ("القاعدة صفر", "Règle zéro").

## Terms used across the feature

Translate these consistently every time they appear.

| English | Meaning |
| --- | --- |
| Relationship Lab | The workshops section |
| Relationship Quizzes | The quiz section |
| Relationship Adventures | The story section |
| Shared Journal | The couple's saved agreements and lessons |
| Lock in my answer | Seal a private answer (cannot be changed) |
| Choose | Make an open choice in a story |
| Turning point | A pivotal scene |
| Let the story decide | Hand a stuck joint choice to the story |
| Discuss in chat | Send a line about this to the couple's chat |
| Same page | You both answered the same |
| Completed | Played to the end |
| Getting to know / Engaged / Married | The couple's stage |

## Lessons and endings

The teaching lines matter most. Keep the ideas precise:

- **"Validation does not necessarily mean agreement."** — understanding
  someone's feeling is not the same as agreeing with them.
- **The anxious/avoidant loop** — one partner reaches out more when they feel
  distance; the other pulls back when they feel pressure; each makes the other's
  move worse. Use your language's established psychology term if one exists,
  otherwise describe it plainly.
- **"Small things"** (Rule 1) — minor irritations, raised early.
- Ending **moods** (Steady, Tender, Fragile, Strained, Bittersweet, Renewed)
  are one-word labels — keep them one word where possible.

## Right-to-left languages

Arabic, Urdu and Persian are laid out right to left automatically once the
language is switched on. Write naturally; don't add direction marks.

## When you're unsure

Choose the wording a thoughtful, practising Muslim couple in their twenties
would use with each other — clear, gentle, a little warm. If a sentence is an
English idiom ("sweat the small stuff", "the pebble and the wall"), translate
the meaning with a natural image in your language rather than word for word.
