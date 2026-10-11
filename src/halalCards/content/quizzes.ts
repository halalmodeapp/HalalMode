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

export const meetingFamilies: Quiz = {
  id: 'quiz-meeting-families',
  kind: 'quiz',
  format: 'same_page',
  topic: 'family',
  tracks: ['engaged'],
  title: 'Meeting the families',
  tagline: 'Visits, expectations and who you will become to each other’s parents.',
  description:
    'Engagement means two families getting to know you. Answer privately, compare, and agree how you want those first visits and relationships to go.',
  minutes: 7,
  cover: slot('quiz-families-cover', 'cover', 'A young engaged couple standing at the front door of a family home holding a box of sweets, an older couple opening the door warmly to welcome them.', 'An engaged couple arriving at a family home with sweets.'),
  cards: [
    { id: 'mf-call', prompt: 'My future in-laws should call me…', options: ['By my name', 'Daughter / son', 'However feels natural to them', 'I haven’t thought about it'] },
    { id: 'mf-visits', prompt: 'Before the nikah, we should visit each family…', options: ['Every week', 'A few times a month', 'For occasions', 'As little as possible'] },
    { id: 'mf-advice', prompt: 'When my parents give advice about our plans, you should…', options: ['Take it seriously', 'Listen politely, then decide with me', 'Let me handle my parents', 'Tell them your view directly'], talk: 'Who handles whose parents?' },
    { id: 'mf-gifts', prompt: 'Gifts for each other’s families…', options: ['Generous — it shows respect', 'Thoughtful but modest', 'Only on occasions', 'Not expected'] },
    { id: 'mf-differences', prompt: 'If our families’ customs clash…', options: ['We follow the bride’s family', 'We follow the groom’s family', 'We blend them', 'We make our own'] },
    { id: 'mf-concern', prompt: 'What worries me most about your family is…', options: ['Nothing — I like them', 'Their expectations of me', 'How involved they’ll be', 'Not fitting in'], talk: 'Say it kindly. Say it now.' },
  ],
  guide: [{ id: 'mf-g1', text: 'Each of us handles our own parents, kindly and in agreement.' }],
};

export const weddingBudget: Quiz = {
  id: 'quiz-wedding-budget',
  kind: 'quiz',
  format: 'scale',
  topic: 'money',
  tracks: ['engaged'],
  title: 'The wedding budget',
  tagline: 'Where the money goes — and where it doesn’t.',
  description: 'Place yourselves on each scale before anyone else does it for you. The gaps are where your families will push.',
  minutes: 6,
  cover: slot('quiz-budget-cover', 'cover', 'An engaged couple at a café table with a small notebook, a calculator and two cups of coffee, the woman writing numbers, the man pointing at one, smiling.', 'An engaged couple planning a budget at a café.'),
  cards: [
    { id: 'wb-total', prompt: 'The whole wedding should cost…', options: ['As little as possible', 'A few months’ savings', 'A year’s savings', 'Whatever it takes'] },
    { id: 'wb-guests', prompt: 'Guests…', options: ['Under 50', '50–150', '150–300', '300+'] },
    { id: 'wb-outfits', prompt: 'Spending on outfits and jewellery…', options: ['Minimal', 'Modest', 'Generous', 'Lavish'] },
    { id: 'wb-families', prompt: 'Families contributing money…', options: ['Not at all', 'A little, if offered', 'Generously', 'They pay for most'] },
    { id: 'wb-home', prompt: 'Wedding versus first home…', options: ['Home comes first, always', 'Mostly the home', 'An even split', 'The wedding is once in a lifetime'], talk: 'This card shapes your first five years.' },
  ],
  guide: [{ id: 'wb-g1', text: 'We set our wedding budget together, before anyone else does.' }],
};

export const keepingLove: Quiz = {
  id: 'quiz-keeping-love',
  kind: 'quiz',
  format: 'guess_my_answer',
  topic: 'affection',
  tracks: ['married'],
  title: 'Keeping love alive',
  tagline: 'The small things that keep a marriage warm.',
  description: 'Answer for yourself and guess for your spouse. The surprises show where a little effort would go a long way.',
  minutes: 6,
  cover: slot('quiz-love-cover', 'cover', 'A married couple in their kitchen, the husband handing his wife a cup of tea with a small note on the saucer, both smiling, morning light.', 'A husband handing his wife tea with a little note.'),
  cards: [
    { id: 'kl-surprise', prompt: 'A surprise I’d love is…', guessPrompt: 'A surprise {{name}} would love is…', options: ['A handwritten note', 'A day out', 'Breakfast made for me', 'A small gift'] },
    { id: 'kl-time', prompt: 'Our best time together is…', guessPrompt: 'For {{name}}, our best time together is…', options: ['Long talks', 'Doing something new', 'Quiet evenings in', 'Praying together'] },
    { id: 'kl-words', prompt: 'Words that mean the most to me…', guessPrompt: 'Words that mean the most to {{name}}…', options: ['“I’m proud of you”', '“Thank you”', '“I love you”', '“I’ve got this”'] },
    { id: 'kl-reset', prompt: 'After a hard week, I need…', guessPrompt: 'After a hard week, {{name}} needs…', options: ['Rest, alone', 'Time together', 'To get out of the house', 'Help catching up'] },
    { id: 'kl-ritual', prompt: 'A ritual I’d love us to start…', guessPrompt: 'A ritual {{name}} would love us to start…', options: ['A weekly walk', 'Monthly dinner out', 'Reading Qur’an together', 'A yearly trip, just us'], talk: 'Pick one and put it in the diary.' },
  ],
  guide: [{ id: 'kl-g1', text: 'We keep one small ritual that is just ours.' }],
};

export const parentingTogether: Quiz = {
  id: 'quiz-parenting',
  kind: 'quiz',
  format: 'same_page',
  topic: 'future',
  tracks: ['married'],
  title: 'Parenting together',
  tagline: 'How we will raise them, before they are raising us.',
  description: 'Children change everything. Answer privately and compare your instincts about discipline, faith, screens and family help.',
  minutes: 7,
  cover: slot('quiz-parenting-cover', 'cover', 'A married couple sitting on a rug with a toddler stacking wooden blocks, the parents smiling at each other over the child’s head, soft afternoon light.', 'A couple playing with their toddler on a rug.'),
  cards: [
    { id: 'pt-discipline', prompt: 'Discipline should mostly be…', options: ['Firm rules, clear consequences', 'Calm explanation', 'Gentle, with a few firm lines', 'Whatever works on the day'] },
    { id: 'pt-faith', prompt: 'Teaching our children the deen…', options: ['Mostly at home, by us', 'Madrasah and home together', 'Islamic school', 'By example more than lessons'] },
    { id: 'pt-screens', prompt: 'Screens before age five…', options: ['None', 'Very little', 'Some, with limits', 'Not a big concern'] },
    { id: 'pt-roles', prompt: 'Night wakings and nappies…', options: ['Shared equally', 'Mostly one of us, by agreement', 'Whoever is less tired', 'Grandparents help a lot'] },
    { id: 'pt-disagree', prompt: 'If we disagree on a parenting call in front of the kids…', options: ['Back each other, discuss later', 'Talk it through in front of them', 'The parent who started decides', 'Pause and step away together'], talk: 'This one comes up sooner than you think.' },
    { id: 'pt-grand', prompt: 'Grandparents’ say in how we parent…', options: ['A lot — they know best', 'Advice welcome, we decide', 'Only if we ask', 'Very little'] },
  ],
  guide: [
    { id: 'pt-g1', text: 'In front of the children, we back each other and discuss in private.' },
    { id: 'pt-g2', text: 'Grandparents advise; we decide.' },
  ],
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
  meetingFamilies,
  weddingBudget,
  keepingLove,
  parentingTogether,
];
