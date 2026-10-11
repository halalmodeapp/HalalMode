import type { Quiz } from '../types.ts';
import { slot } from './images.ts';

/**
 * Relationship Quizzes: lighter, quicker, for getting to know each other.
 * Everything is answered in private and revealed together. A deck is one
 * format and one topic; add a deck by adding an object here.
 */

export const knowMe: Quiz = {
  id: 'quiz-know-me',
  kind: 'quiz',
  format: 'know_me',
  topic: 'getting_to_know',
  title: 'How well do you know me?',
  tagline: 'Take turns: one answers, the other guesses.',
  description:
    'On each card one of you answers about yourself and the other guesses. You swap every card. Keep score if you like — the stories behind the misses are the best part.',
  minutes: 8,
  cover: slot('quiz-know-me-cover', 'cover', 'Two hands each holding a playing card face-down over a low table, a plate of dates between them.', 'Two hands holding cards face down.'),
  cards: [
    { id: 'km-comfort', prompt: 'Your perfect comfort food after a long day?', guessPrompt: 'What is {{name}}’s comfort food after a long day?', options: ['Biryani or rice dish', 'Pizza or burger', 'Mum’s home cooking', 'Something sweet'] },
    { id: 'km-recharge', prompt: 'How do you recharge best?', guessPrompt: 'How does {{name}} recharge best?', options: ['Alone and quiet', 'With close friends', 'With family', 'Outdoors, moving'] },
    { id: 'km-morning', prompt: 'After Fajr, you…', guessPrompt: 'After Fajr, {{name}}…', options: ['Go back to sleep', 'Read Qur’an or make dhikr', 'Start the day — gym, work, plans', 'Depends on the day'] },
    { id: 'km-hurt', prompt: 'When you are upset, you mostly want…', guessPrompt: 'When {{name}} is upset, they mostly want…', options: ['To talk it through now', 'Some space first', 'A distraction', 'A hug and no words'], talk: 'Worth remembering for real: this is the card that saves arguments.' },
    { id: 'km-trip', prompt: 'Your dream trip?', guessPrompt: '{{name}}’s dream trip?', options: ['Umrah, then a slow tour of Madinah', 'Mountains and lakes', 'A city full of history', 'A beach with nothing to do'] },
    { id: 'km-gift', prompt: 'Which would mean the most to you?', guessPrompt: 'Which would mean the most to {{name}}?', options: ['A thoughtful gift', 'Kind words, said out loud', 'Help with something I am dreading', 'Uninterrupted time together'] },
    { id: 'km-fear', prompt: 'What worries you most about marriage?', guessPrompt: 'What worries {{name}} most about marriage?', options: ['Losing my independence', 'Not getting on with the family', 'Money pressure', 'Growing apart'], talk: 'Whatever the answer, ask what is behind it.' },
    { id: 'km-friday', prompt: 'Your ideal Friday evening?', guessPrompt: '{{name}}’s ideal Friday evening?', options: ['Big family dinner', 'Halaqa or masjid', 'Quiet night in', 'Out with friends'] },
  ],
  guide: [{ id: 'km-g1', text: 'When one of us is upset, we remember what the other actually needs first.' }],
};

export const guessMyAnswer: Quiz = {
  id: 'quiz-guess-my-answer',
  kind: 'quiz',
  format: 'guess_my_answer',
  topic: 'lifestyle',
  title: 'Guess my answer',
  tagline: 'Answer for yourself, then guess theirs — both at once.',
  description:
    'Every card, both of you answer for yourselves and guess the other. The reveal shows who knows whom better — and where your daily lives would rub.',
  minutes: 9,
  cover: slot('quiz-guess-cover', 'cover', 'Two speech bubbles shaped like cards overlapping, one with a question mark in gold.', 'Two overlapping card-shaped speech bubbles.'),
  cards: [
    { id: 'gm-tidy', prompt: 'At home, I am…', guessPrompt: 'At home, {{name}} is…', options: ['Very tidy', 'Tidy-ish', 'Relaxed about mess', 'Organised chaos'] },
    { id: 'gm-guests', prompt: 'Guests at home…', guessPrompt: 'For {{name}}, guests at home…', options: ['Every weekend, the more the better', 'Once or twice a month', 'Only family, only sometimes', 'Rarely — home is for us'] },
    { id: 'gm-night', prompt: 'I am naturally a…', guessPrompt: '{{name}} is naturally a…', options: ['Early bird', 'Night owl', 'Whatever the day needs'] },
    { id: 'gm-screens', prompt: 'Evenings, I would rather…', guessPrompt: 'Evenings, {{name}} would rather…', options: ['Watch something together', 'Read or study', 'Go out somewhere', 'Talk over tea'] },
    { id: 'gm-cook', prompt: 'Cooking at home should be…', guessPrompt: 'For {{name}}, cooking at home should be…', options: ['Mostly me', 'Mostly my spouse', 'Shared or taking turns', 'Whoever is less tired'] },
    { id: 'gm-plans', prompt: 'Weekend plans are best…', guessPrompt: 'For {{name}}, weekend plans are best…', options: ['Made days in advance', 'Decided that morning', 'Not made at all'] },
    { id: 'gm-pets', prompt: 'A cat at home?', guessPrompt: 'A cat at home — {{name}} would say…', options: ['Yes, absolutely', 'Maybe one day', 'Rather not'] },
  ],
};

export const samePageMoney: Quiz = {
  id: 'quiz-same-page-money',
  kind: 'quiz',
  format: 'same_page',
  topic: 'money',
  title: 'Money',
  tagline: 'The conversations couples wish they had had earlier.',
  description:
    'Answer privately, reveal together. Different answers are not a problem — finding out after the nikah is. Each card has a question to talk over.',
  minutes: 10,
  cover: slot('quiz-money-cover', 'cover', 'A small brass bowl of coins beside a notebook with two pens, one gold and one black.', 'A bowl of coins beside a shared notebook.'),
  cards: [
    { id: 'mo-pool', prompt: 'After marriage, our money should be…', options: ['Fully shared', 'Shared for the home, the rest our own', 'Kept separate, split the bills', 'His provides for the home, hers is hers'], talk: 'What does fairness look like to each of you here?' },
    { id: 'mo-parents', prompt: 'Supporting parents financially…', options: ['Is a duty, whatever it takes', 'Yes, within a budget we agree', 'Only if they truly need it', 'We have not needed to think about it'] },
    { id: 'mo-big', prompt: 'A purchase over £500 needs…', options: ['A conversation first, always', 'Just a heads-up', 'Nothing — trust each other'] },
    { id: 'mo-debt', prompt: 'Debt, including student loans or car finance…', options: ['Avoid it completely', 'Fine if it is halal financing', 'Only for a home', 'It is normal; manage it'] },
    { id: 'mo-save', prompt: 'You get an unexpected £3,000. You…', options: ['Save it', 'Give a good part in sadaqah', 'Spend on something for us', 'Pay down what we owe'] },
    { id: 'mo-wedding', prompt: 'The wedding should be…', options: ['Small and simple', 'Medium — family and close friends', 'Big — it is once in a lifetime', 'Whatever our families want'], talk: 'Who is paying, and who decides?' },
    { id: 'mo-work', prompt: 'Once children come, work looks like…', options: ['Both keep working', 'One steps back for a few years', 'One stays home long-term', 'We decide when we get there'] },
  ],
  guide: [
    { id: 'mo-g1', text: 'Make major financial decisions together.' },
    { id: 'mo-g2', text: 'Agree how we support our parents before it comes up.' },
  ],
};

export const samePageFamily: Quiz = {
  id: 'quiz-same-page-family',
  kind: 'quiz',
  format: 'same_page',
  topic: 'family',
  title: 'Family',
  tagline: 'In-laws, boundaries and the families you are joining.',
  description:
    'Two families are about to become one. Answer privately, compare, and talk about what each answer would mean in an ordinary week.',
  minutes: 10,
  cover: slot('quiz-family-cover', 'cover', 'A long dinner table seen from above, many hands passing dishes, two hands in the middle touching gently.', 'Many hands passing dishes around a family table.'),
  cards: [
    { id: 'fa-live', prompt: 'Living with parents after marriage?', options: ['Yes, it is our tradition', 'For a short while only', 'Close by, not together', 'Our own home, wherever it is'] },
    { id: 'fa-visit', prompt: 'How often should we visit each family?', options: ['Every week', 'Every couple of weeks', 'Monthly', 'When it suits us'] },
    { id: 'fa-private', prompt: 'Our disagreements should be…', options: ['Kept between us, always', 'Shared only with a trusted elder', 'Fine to discuss with family'], talk: 'Who, if anyone, would you each go to for advice?' },
    { id: 'fa-decide', prompt: 'If my parents disagree with a decision we made…', options: ['We decide, and explain kindly', 'We reconsider seriously', 'Their wishes come first'] },
    { id: 'fa-eid', prompt: 'Eid day is spent with…', options: ['His family', 'Her family', 'Alternate each year', 'Both, split the day'] },
    { id: 'fa-children', prompt: 'Grandparents’ role in raising our children…', options: ['Big — they help daily', 'Regular, but we lead', 'Occasional', 'We raise them ourselves'] },
  ],
  guide: [{ id: 'fa-g1', text: 'Keep private disagreements private.' }],
};

export const moreLikely: Quiz = {
  id: 'quiz-more-likely',
  kind: 'quiz',
  format: 'more_likely',
  topic: 'just_for_fun',
  title: 'Who is more likely to…?',
  tagline: 'Point at yourself or at them. No arguing (much).',
  description:
    'Quick and silly. Each card, both of you secretly point at who is more likely. See if you agree — and defend yourselves.',
  minutes: 5,
  cover: slot('quiz-likely-cover', 'cover', 'Two playful hands pointing at each other across a table scattered with sweets.', 'Two hands pointing playfully at each other.'),
  cards: [
    { id: 'ml-late', prompt: '…be late for Jumu’ah?', options: [] },
    { id: 'ml-cry', prompt: '…cry at a nasheed or a wedding speech?', options: [] },
    { id: 'ml-lost', prompt: '…get you both lost and refuse directions?', options: [] },
    { id: 'ml-guests', prompt: '…invite guests without checking first?', options: [] },
    { id: 'ml-sorry', prompt: '…say sorry first after an argument?', options: [], talk: 'Why — and is that how you would want it?' },
    { id: 'ml-plant', prompt: '…forget to water the plants?', options: [] },
    { id: 'ml-food', prompt: '…finish the other’s leftovers?', options: [] },
    { id: 'ml-alarm', prompt: '…snooze the Fajr alarm “just five more minutes”?', options: [] },
    { id: 'ml-plan', prompt: '…plan a surprise?', options: [] },
  ],
};

export const wouldYouRather: Quiz = {
  id: 'quiz-would-you-rather',
  kind: 'quiz',
  format: 'would_you_rather',
  topic: 'just_for_fun',
  title: 'Would you rather?',
  tagline: 'Two options. No “neither”.',
  description: 'Pick one, privately. The reveal shows where you match — and starts the best arguments.',
  minutes: 5,
  cover: slot('quiz-wyr-cover', 'cover', 'A fork in a garden path lined with lanterns, one path toward mountains, one toward the sea.', 'A garden path forking two ways.'),
  cards: [
    { id: 'wy-house', prompt: 'Would you rather…', options: ['Small home in the city', 'Big home in the countryside'] },
    { id: 'wy-umrah', prompt: 'Would you rather…', options: ['Umrah every Ramadan', 'One long trip to see the Muslim world'] },
    { id: 'wy-cook', prompt: 'Would you rather…', options: ['Always cook', 'Always wash up'] },
    { id: 'wy-speak', prompt: 'Would you rather…', options: ['Be fluent in Arabic', 'Know the Qur’an by heart'], talk: 'Is either of you working on one now?' },
    { id: 'wy-trip', prompt: 'Would you rather…', options: ['Plan every detail of a trip', 'Arrive and see what happens'] },
    { id: 'wy-argue', prompt: 'Would you rather…', options: ['Talk it out the same night', 'Sleep on it and talk tomorrow'], talk: 'This one matters more than it looks.' },
    { id: 'wy-weekend', prompt: 'Would you rather…', options: ['A weekend with all the family', 'A weekend with nobody but us'] },
    { id: 'wy-letter', prompt: 'Would you rather receive…', options: ['A handwritten letter', 'A surprise day out'] },
  ],
};

export const expectations: Quiz = {
  id: 'quiz-expectations',
  kind: 'quiz',
  format: 'scale',
  topic: 'expectations',
  title: 'Expectations',
  tagline: 'Roles, home and how a marriage runs, day to day.',
  description:
    'Each card is a scale. Place yourself privately; the reveal shows how far apart you are. Close is fine. Far apart is worth a real conversation.',
  minutes: 9,
  cover: slot('quiz-expect-cover', 'cover', 'A brass balance scale on a wooden table with a key on one side and a teacup on the other.', 'A balance scale holding a key and a teacup.'),
  cards: [
    { id: 'ex-chores', prompt: 'Housework should be…', options: ['Mostly the wife', 'Leaning to the wife', 'Shared equally', 'Leaning to the husband', 'Whoever is home more'] },
    { id: 'ex-provide', prompt: 'Providing for the home is…', options: ['The husband’s alone', 'Mainly his, she helps if she wants', 'Shared', 'Whoever earns more'] },
    { id: 'ex-time', prompt: 'Time together versus time apart…', options: ['Almost everything together', 'Most evenings together', 'A good balance', 'Plenty of our own time'] },
    { id: 'ex-friends', prompt: 'Friends after marriage…', options: ['See them less — marriage first', 'Regularly, but planned', 'Same as now'] },
    { id: 'ex-deen', prompt: 'Growing in deen together looks like…', options: ['Praying together daily', 'Shared goals, our own pace', 'A private matter for each'], talk: 'What would you each love to do together?' },
    { id: 'ex-decide', prompt: 'Big decisions are made…', options: ['Husband decides after consulting', 'Together, he has the final word', 'Together until we agree', 'Whoever it affects most'] },
  ],
};

export const futurePlans: Quiz = {
  id: 'quiz-future',
  kind: 'quiz',
  format: 'same_page',
  topic: 'future',
  title: 'Future plans',
  tagline: 'Where, when, how many — and what for.',
  description: 'The big picture: children, home, career and the life you are aiming for. Answer privately and compare.',
  minutes: 8,
  cover: slot('quiz-future-cover', 'cover', 'A window looking out at a distant city skyline at dawn, two mugs on the sill.', 'A window at dawn with two mugs on the sill.'),
  cards: [
    { id: 'fu-kids', prompt: 'Children…', options: ['As soon as Allah wills', 'After a year or two', 'After a few years', 'Not sure yet'] },
    { id: 'fu-howmany', prompt: 'How many, ideally?', options: ['One or two', 'Three or four', 'Five or more', 'Whatever Allah writes'] },
    { id: 'fu-where', prompt: 'In ten years we live…', options: ['Near our families', 'Wherever work takes us', 'In a Muslim-majority country', 'Somewhere quiet, away from cities'] },
    { id: 'fu-school', prompt: 'Our children’s school…', options: ['Islamic school', 'State school plus madrasah', 'Home education', 'Whatever is best locally'] },
    { id: 'fu-career', prompt: 'Your career in five years…', options: ['Climbing — it matters to me', 'Steady, not consuming', 'Something of my own', 'Less work, more family'] },
    { id: 'fu-hajj', prompt: 'Hajj together…', options: ['Within the first few years', 'Once we are settled', 'When the children are older'] },
  ],
  guide: [{ id: 'fu-g1', text: 'Revisit our big plans together every year.' }],
};

export const affection: Quiz = {
  id: 'quiz-affection',
  kind: 'quiz',
  format: 'guess_my_answer',
  topic: 'affection',
  title: 'Love languages',
  tracks: ['engaged', 'married'],
  tagline: 'How you each feel cared for — and how you show it.',
  description: 'Answer for yourself, guess for them. Most couples show love the way they want to receive it — which is not always how the other hears it.',
  minutes: 7,
  cover: slot('quiz-affection-cover', 'cover', 'A folded note tucked into a coat pocket, a sprig of jasmine beside it.', 'A folded note in a coat pocket with jasmine.'),
  cards: [
    { id: 'af-feel', prompt: 'I feel most loved when…', guessPrompt: '{{name}} feels most loved when…', options: ['I am told, in words', 'I am helped without asking', 'We spend real time together', 'I am given something thoughtful', 'I am held'] },
    { id: 'af-show', prompt: 'I usually show love by…', guessPrompt: '{{name}} usually shows love by…', options: ['Saying it', 'Doing things', 'Making time', 'Giving gifts', 'Being close'] },
    { id: 'af-bad', prompt: 'On a bad day, I most want…', guessPrompt: 'On a bad day, {{name}} most wants…', options: ['To be listened to', 'Practical help', 'Company, not conversation', 'To be left alone for a bit'] },
    { id: 'af-public', prompt: 'Affection in front of family…', guessPrompt: 'For {{name}}, affection in front of family is…', options: ['Fine, within modesty', 'Small things only', 'Keep it private'] },
    { id: 'af-dua', prompt: 'Making du’a for each other out loud…', guessPrompt: 'For {{name}}, making du’a out loud for each other is…', options: ['Beautiful — I would love it', 'Nice sometimes', 'I prefer it private'] },
  ],
  guide: [{ id: 'af-g1', text: 'Show love the way the other receives it, not only the way we give it.' }],
};

// ---------------------------------------------------------------------------
// Engaged and married tracks
// ---------------------------------------------------------------------------

export const nikahPlans: Quiz = {
  id: 'quiz-nikah-plans',
  kind: 'quiz',
  format: 'same_page',
  topic: 'family',
  tracks: ['engaged'],
  title: 'Planning the nikah',
  tagline: 'The decisions between “yes” and the nikah.',
  description:
    'Engaged couples make dozens of decisions fast, often with two families watching. Answer privately, compare, and settle the ones that matter before anyone else settles them for you.',
  minutes: 8,
  cover: slot('quiz-nikah-cover', 'cover', 'An engaged couple sitting at a café table with their two mothers, a small notebook and a calendar between them, everyone leaning in kindly.', 'An engaged couple planning with their mothers at a café table.'),
  cards: [
    { id: 'nk-time', prompt: 'From engagement to nikah should take…', options: ['A few weeks', 'Two or three months', 'Six months or so', 'As long as we need'] },
    { id: 'nk-mahr', prompt: 'The mahr should be decided by…', options: ['The bride, freely', 'The two of us together', 'Our families, with our agreement', 'Custom in our community'], talk: 'What does the mahr mean to each of you?' },
    { id: 'nk-wali', prompt: 'The wali’s role in our planning is…', options: ['Central — he leads it', 'Consulted on the big things', 'Mostly a formality', 'Still to be worked out'] },
    { id: 'nk-size', prompt: 'The nikah itself should be…', options: ['Just close family at the masjid', 'Family and friends, simple', 'A full celebration', 'Small nikah now, celebration later'] },
    { id: 'nk-first-home', prompt: 'Our first home is…', options: ['Our own place from day one', 'With one family for a while', 'Close to one family', 'Wherever work takes us'] },
    { id: 'nk-tension', prompt: 'If our families disagree about the plans…', options: ['We decide together and tell them kindly', 'We ask an elder to help', 'We go with whoever feels most strongly', 'We compromise on everything'], talk: 'Which decisions are ours alone?' },
  ],
  guide: [
    { id: 'nk-g1', text: 'We agree between ourselves before we answer our families.' },
    { id: 'nk-g2', text: 'The nikah is the point; everything else is optional.' },
  ],
};

export const firstYear: Quiz = {
  id: 'quiz-first-year',
  kind: 'quiz',
  format: 'scale',
  topic: 'expectations',
  tracks: ['engaged', 'married'],
  title: 'The first year',
  tagline: 'What an ordinary week of marriage looks like.',
  description:
    'Most early-marriage friction is about rhythm, not values: how often, how much, who does what. Place yourselves on each scale and see where your weeks would clash.',
  minutes: 7,
  cover: slot('quiz-first-year-cover', 'cover', 'A young married couple in a small flat unpacking boxes together, one holding a framed picture, the other laughing, a kettle on the counter.', 'A newly married couple unpacking boxes in their first home.'),
  cards: [
    { id: 'fy-visits', prompt: 'Family visits in the first year…', options: ['Several times a week', 'Every weekend', 'Every couple of weeks', 'Monthly', 'Only on occasions'] },
    { id: 'fy-alone', prompt: 'Evenings with nobody but us…', options: ['Most nights', 'A few a week', 'Once a week', 'When we can'] },
    { id: 'fy-money', prompt: 'Sitting down together about money…', options: ['Every week', 'Every month', 'A few times a year', 'Only when something comes up'] },
    { id: 'fy-prayer', prompt: 'Praying together at home…', options: ['Every prayer we can', 'At least once a day', 'Now and then', 'We each keep our own'] },
    { id: 'fy-friends', prompt: 'Time with friends, apart from each other…', options: ['Rarely, the first year', 'Now and then', 'Every week', 'As much as before'] },
    { id: 'fy-repair', prompt: 'After a disagreement, we talk it through…', options: ['Before we sleep', 'The next day', 'Once we have both calmed down', 'When it comes up again'], talk: 'This one shapes every other year.' },
  ],
  guide: [{ id: 'fy-g1', text: 'We protect some evenings that belong only to us.' }],
};

export const marriedCheckIn: Quiz = {
  id: 'quiz-married-check-in',
  kind: 'quiz',
  format: 'guess_my_answer',
  topic: 'affection',
  tracks: ['married'],
  title: 'Married check-in',
  tagline: 'How are we, really — lately?',
  description:
    'A quiet check-in for married couples. Answer for yourself and guess for the other: the gaps show what you have each been carrying without saying.',
  minutes: 6,
  cover: slot('quiz-check-in-cover', 'cover', 'A married couple sitting on a sofa at the end of the day with mugs of tea, turned toward each other, talking softly, a lamp glowing.', 'A married couple talking over tea at the end of the day.'),
  cards: [
    { id: 'ci-need', prompt: 'Lately, I could use more…', guessPrompt: 'Lately, {{name}} could use more…', options: ['Time together', 'Help at home', 'Rest', 'Encouragement'] },
    { id: 'ci-stress', prompt: 'What’s weighing on me most right now…', guessPrompt: 'What’s weighing on {{name}} most right now…', options: ['Work', 'Family', 'Money', 'Our deen', 'Nothing much'] },
    { id: 'ci-best', prompt: 'The best moment for us this month was…', guessPrompt: 'For {{name}}, the best moment for us this month was…', options: ['Something we did together', 'A conversation', 'A quiet ordinary day', 'Time with family'] },
    { id: 'ci-unsaid', prompt: 'Something small I haven’t mentioned is about…', guessPrompt: 'Something small {{name}} hasn’t mentioned is about…', options: ['Chores', 'Time', 'Family', 'Nothing — we’re good'], talk: 'Rule 1: small things, early.' },
    { id: 'ci-dua', prompt: 'My du’a for us this month is mostly about…', guessPrompt: '{{name}}’s du’a for us this month is mostly about…', options: ['Barakah in our home', 'Patience with each other', 'Children', 'Our families'] },
  ],
  guide: [{ id: 'ci-g1', text: 'We check in with each other once a month, on purpose.' }],
};

export const QUIZZES: Quiz[] = [
  knowMe,
  guessMyAnswer,
  samePageMoney,
  samePageFamily,
  expectations,
  futurePlans,
  affection,
  moreLikely,
  wouldYouRather,
  nikahPlans,
  firstYear,
  marriedCheckIn,
];
