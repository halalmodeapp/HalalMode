import { useCallback } from 'react';

import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/locales';

/**
 * Halal Cards' own interface copy. Kept beside the content rather than in
 * the app catalogue because, like the content, it is English-first: a
 * language is added by filling `translations` below (any missing line falls
 * back to English), without touching sixteen catalogues for a feature that
 * cannot be translated until its stories are.
 */
const en = {
  'brand': 'Halal Cards',
  'brandWith': 'with {{name}}',
  'hubIntro': 'Understand each other, learn why relationships work and fail, and practise healthier patterns — together.',
  'lab': 'Relationship Lab',
  'labBlurb': 'A workshop in scenarios. Choose, see what follows, then talk.',
  'quizzes': 'Relationship Quizzes',
  'quizzesBlurb': 'Lighter, quicker, and revealing. Answer privately, reveal together.',
  'adventures': 'Relationship Adventures',
  'adventuresBlurb': 'Turn-based stories where every choice changes the ending.',
  'comingSoon': 'Coming soon',
  'conceptsBlurb': 'Adventures being written now.',
  'minutes': '{{count}} min',
  'kind.lab': 'Relationship Lab',
  'kind.quiz': 'Quiz',
  'kind.adventure': 'Adventure',
  'format.know_me': 'Take turns guessing',
  'format.guess_my_answer': 'Answer and guess',
  'format.same_page': 'Same page?',
  'format.more_likely': 'Point at one of you',
  'format.would_you_rather': 'Pick one',
  'format.scale': 'Somewhere on a scale',

  'guide': 'Our Relationship Guide',
  'guideBlurb': 'The lessons and agreements you both chose to keep.',
  'guideCount': '{{count}} agreed',
  'guidePending': '{{count}} waiting',
  'guideEmpty': 'Nothing yet. As you play, save the lessons and agreements you both want to keep.',
  'guideAddPlaceholder': 'Write an agreement in your own words',
  'guideAdd': 'Suggest',
  'guideTheyProposed': '{{name}} suggested this. Do you agree?',
  'guideYouProposed': 'Waiting for {{name}} to agree',
  'guideAgree': 'Agree',
  'guideRemove': 'Remove',
  'guideSave': 'Save to our guide',
  'guideSaved': 'Suggested to {{name}}',
  'guideAgreed': 'In your guide',
  'guideHow': 'An entry joins your guide once you have both agreed to it.',
  'guideFrom': 'From {{source}}',

  'invitations': 'Invitations',
  'inProgress': 'In progress',
  'finished': 'Finished',
  'invitedYou': '{{name}} invited you to play',
  'accept': 'Play',
  'decline': 'Not now',
  'resume': 'Resume',
  'yourTurn': 'Your turn',
  'theirTurn': 'Waiting for {{name}}',
  'waitingAccept': 'Waiting for {{name}} to accept',
  'invite': 'Invite {{name}}',
  'replay': 'Play again',
  'openActivity': 'Open',

  'premiumTitle': 'Halal Cards is part of Premium',
  'premiumBody': 'If either of you has Premium, you can unlock Halal Cards for this connection and invite {{name}} to play — they never need to subscribe.',
  'premiumCta': 'Explore Premium',
  'premiumPreview': 'Preview — browse everything, invite with Premium.',
  'unlockedByYou': 'You unlocked Halal Cards for the two of you.',
  'unlockedForYou': 'Unlocked for the two of you — free to play.',

  'howItWorks': 'How it works',
  'how.lab': 'Each scenario is answered privately by both of you. Then you see what each choice would set in motion — and talk.',
  'how.quiz': 'Answer each card privately. Nothing is shown until you have both answered.',
  'how.adventure': 'Take turns as {{a}} and {{b}}. Some moments you decide alone, some in secret at the same time, some together. Earlier choices change later scenes.',
  'youPlay': 'You play {{name}}',
  'theyPlay': '{{name}} plays {{role}}',

  'inviteSent': 'Invitation sent',
  'inviteSentBody': 'It is in your chat with {{name}}. You will start as soon as they accept.',
  'cancelInvite': 'Withdraw invitation',
  'declinedTitle': 'Not this time',
  'declinedBody': '{{name}} said not now. You can invite them to something else whenever you like.',
  'cancelledTitle': 'This session has ended',
  'cancelledBody': 'Either of you can start it again from Halal Cards.',
  'leave': 'End this session',
  'leaveTitle': 'End this session?',
  'leaveBody': 'It will stop for both of you. Anything saved to your guide stays.',
  'leaveConfirm': 'End it',
  'keepPlaying': 'Keep playing',

  'next': 'Next',
  'continue': 'Continue',
  'finish': 'Finish',
  'lockIn': 'Lock in my answer',
  'lockedIn': 'Locked in',
  'waitingFor': 'Waiting for {{name}} to answer…',
  'privateNote': 'Private until you have both answered.',
  'revealing': 'Revealing…',
  'you': 'You',
  'step': '{{done}} of {{total}}',
  'talk': 'Talk about it',
  'followUps': 'Keep going',
  'sameChoice': 'You both chose the same.',
  'bothHelp': 'Different choices — both likely to help.',
  'split': 'You chose differently. Worth asking why.',
  'bothStruggle': 'Both tempting — and both likely to make it harder.',
  'tone.helps': 'Likely helps',
  'tone.mixed': 'Mixed',
  'tone.harms': 'Likely hurts',
  'insight': 'Why it works',
  'lessonDone': 'Lesson complete',
  'lessonDoneBody': 'Keep anything you both want to remember.',

  'aboutYou': 'About you',
  'yourGuess': 'Your guess about {{name}}',
  'theyAnswerYouGuess': '{{name}} answers. You guess.',
  'youAnswerTheyGuess': 'You answer. {{name}} guesses.',
  'guessedRight': 'Guessed right',
  'guessedWrong': 'Not quite',
  'samePage': 'Same page',
  'different': 'Different — talk about it',
  'close': 'Close',
  'apart': '{{count}} steps apart',
  'pointedAt': 'pointed at',
  'agreeWho': 'You agree!',
  'disagreeWho': 'You disagree — defend yourselves.',
  'said': 'said',
  'guessed': 'guessed',
  'quizDone': 'Quiz complete',
  'quizScoreSame': 'Same answer on {{agreed}} of {{total}}',
  'quizScoreClose': 'and close on {{count}} more',
  'quizScoreGuesses': '{{name}} guessed {{right}} of {{total}}',
  'me': 'Me',
  'myPartner': 'My partner',

  'role': 'You are {{name}}',
  'turningPoint': 'Turning point',
  'theirMove': '{{role}}’s move — {{name}} is deciding',
  'yourMove': 'Your move as {{role}}',
  'jointNote': 'Choose together — you both need to pick the same answer.',
  'privateChoice': 'Choose in secret. Both choices count.',
  'chose': 'chose',
  'mismatch': 'You chose differently. Talk it through, then choose again.',
  'whatHappened': 'What happened',
  'howYouGotHere': 'How your choices led here',
  'pattern': 'The pattern',
  'hiddenStates': 'Beneath the surface',
  'couldHaveChanged': 'What could have changed it',
  'takeaway': 'Take this with you',
  'endingReached': 'One of {{total}} endings',
  'replayHint': 'Choose differently next time to find new scenes and endings.',
  'mood.steady': 'Steady',
  'mood.tender': 'Tender',
  'mood.fragile': 'Fragile',
  'mood.strained': 'Strained',
  'mood.bittersweet': 'Bittersweet',
  'mood.renewed': 'Renewed',
  'illustrationSoon': 'Illustration',

  'chatCardTitle': 'Halal Cards',
  'chatOpen': 'Halal Cards',
  'chatOpenA11y': 'Open Halal Cards with {{name}}',
  'errorTitle': 'Halal Cards could not load',
  'errorBody': 'Please check your connection and try again.',
  'actionError': 'That did not go through. Please try again.',
  'loading': 'Shuffling the cards',
} as const;

export type CardsCopyKey = keyof typeof en;

const translations: Partial<Record<AppLocale, Partial<Record<CardsCopyKey, string>>>> = {};

export function cardsCopy(language: AppLocale, key: CardsCopyKey, params?: Record<string, string | number>): string {
  let message: string = translations[language]?.[key] ?? en[key];
  for (const [name, value] of Object.entries(params ?? {})) {
    message = message.replaceAll(`{{${name}}}`, String(value));
  }
  return message;
}

export function useCardsCopy() {
  const { language } = useI18n();
  return useCallback(
    (key: CardsCopyKey, params?: Record<string, string | number>) => cardsCopy(language, key, params),
    [language]
  );
}
