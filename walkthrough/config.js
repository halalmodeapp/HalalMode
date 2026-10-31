/*
 * Halal Mode walkthrough: every setting in one place.
 *
 * Change a photo, name, line of copy or colour here and reload. Photos are
 * paths relative to this folder (put new ones in people/), or full URLs.
 * The in-page editor (press E) changes the same settings without touching
 * this file; it saves them in this browser and can export them as JSON to
 * paste back in here as `window.HM_OVERRIDES`.
 *
 * Every product claim below matches the app and the Privacy Notice
 * (2026-10-23): 5 daily introductions, interest in up to 3 (Premium: up to
 * 10 of each), interest private unless mutual, three questions chosen
 * separately, answers seen only once both have answered, 35 Halal Cards,
 * 16 languages.
 */
window.HM_CONFIG = {
  brand: {
    ink: '#0A0A0A', surface: '#FCFCFB', sand: '#F2F0EC', canvas: '#EFEEEB',
    gold: '#B8914F', goldOnDark: '#D6B469', goldGlow: '#C5A054',
    pink: '#FC3C6C', pinkDeep: '#C2124A', green: '#2F5D4A',
  },

  // The member whose phone we follow.
  member: { name: 'Zayd', age: 29, city: 'London', job: 'Architectural designer', photo: 'people/zayd-al-mansoor-1.jpg' },

  // Today's five introductions, in the order they are shown. The first one
  // shows interest back and becomes the match.
  introductions: [
    { name: 'Amina', age: 26, city: 'London', job: 'Clinical neuroscientist', photo: 'people/amina-rahmani-1.jpg', photos: ['people/amina-rahmani-2.jpg', 'people/amina-rahmani-3.jpg'],
      bio: 'Fascinated by how the brain learns. Sourdough, classical calligraphy and community work.' },
    { name: 'Yasmine', age: 25, city: 'Manchester', job: 'UX strategist', photo: 'people/yasmine-benali-1.jpg', photos: ['people/yasmine-benali-2.jpg', 'people/yasmine-benali-3.jpg'],
      bio: 'Tea drinker by night. Prayers on time and quiet conversation over noise.' },
    { name: 'Maryam', age: 27, city: 'London', job: 'Fintech product manager', photo: 'people/maryam-el-farouk-1.jpg', photos: ['people/maryam-el-farouk-2.jpg', 'people/maryam-el-farouk-3.jpg'],
      bio: 'Ambitious at work, but home is where my heart rests. Tennis and Seerah study.' },
    { name: 'Layla', age: 24, city: 'Birmingham', job: 'Paediatric physiotherapist', photo: 'people/layla-al-hassan-1.jpg', photos: ['people/layla-al-hassan-2.jpg', 'people/layla-al-hassan-3.jpg'],
      bio: 'Helping children walk and heal. Nature walks and quiet evenings with a book.' },
    { name: 'Salma', age: 28, city: 'Cambridge', job: 'Environmental lawyer', photo: 'people/salma-qureshi-1.jpg', photos: ['people/salma-qureshi-2.jpg', 'people/salma-qureshi-3.jpg'],
      bio: 'Ocean swimming, pottery and long discussions on ethics.' },
  ],

  // Five more, for Premium's ten.
  premiumExtra: [
    { name: 'Soraya', photo: 'people/soraya-kaddouri-1.jpg' },
    { name: 'Zainab', photo: 'people/zainab-mansour-1.jpg' },
    { name: 'Aisha', photo: 'people/aisha-rahman-1.jpg' },
    { name: 'Noor', photo: 'people/noor-siddiqui-1.jpg' },
    { name: 'Sara', photo: 'people/sara-haddad-1.jpg' },
  ],

  // The men, for the woman's side: her introductions (Zayd, the member above,
  // comes first and becomes her match) and Premium's extra five.
  introductionsMen: [
    { name: 'Omar', age: 30, city: 'London', job: 'Civil engineer', photo: 'people/omar-al-sayed-1.jpg', photos: ['people/omar-al-sayed-2.jpg', 'people/omar-al-sayed-3.jpg'] },
    { name: 'Hamza', age: 28, city: 'Leicester', job: 'Pharmacist', photo: 'people/hamza-osman-1.jpg' },
    { name: 'Tariq', age: 31, city: 'London', job: 'Software architect', photo: 'people/tariq-siddiqui-1.jpg' },
    { name: 'Amir', age: 29, city: 'Bristol', job: 'Secondary school teacher', photo: 'people/amir-idrissi-1.jpg' },
    { name: 'Yusuf', age: 27, city: 'Leeds', job: 'Junior doctor', photo: 'people/yusuf-rahman-1.jpg' },
  ],
  premiumExtraMen: [
    { name: 'Bilal', photo: 'people/bilal-malik-1.jpg' },
    { name: 'Adam', photo: 'people/adam-abdullah-1.jpg' },
    { name: 'Ibrahim', photo: 'people/ibrahim-hussain-1.jpg' },
    { name: 'Khalid', photo: 'people/khalid-mohamud-1.jpg' },
    { name: 'Idris', photo: 'people/idris-yilmaz-1.jpg' },
  ],

  // From the app's question library. The second is the one answered on screen.
  questions: [
    'Where do we live in five years, and whose family is nearby?',
    'How do we make prayer a steady part of life at home, without having to remind each other?',
    'Who carries what financially, and how often do we look at it together?',
    'When we disagree badly, what happens in the first ten minutes?',
    'How do we protect the hours that belong only to us?',
  ],
  chosen: [0, 1, 4], // the three the member picks
  shared: [0],       // picked by both: marked "Shared"
  answers: {
    me: 'London for now, close enough to help both our parents.',
    them: 'Near my mum, with long summers near your family.',
  },
  summary: 'You already share a direction on home and family. Your answers differ on how often you would travel, which is worth talking about.',
  chat: [
    { from: 'them', text: 'Then we should talk about where we would live.' },
    { from: 'me', text: 'Agreed. Saturday, after Dhuhr?' },
  ],

  cards: [
    { img: 'cards/read-1142.jpg', kind: 'Story', title: 'Read at 11:42' },
    { img: 'cards/first-ramadan.jpg', kind: 'Story', title: 'The First Ramadan' },
    { img: 'cards/mahr.jpg', kind: 'Story', title: 'The Mahr Conversation' },
    { img: 'cards/lab-pick-well.jpg', kind: 'Lab', title: 'Pick well' },
    { img: 'cards/wedding.jpg', kind: 'Story', title: 'Whose Wedding Is It?' },
    { img: 'cards/raised-voice.jpg', kind: 'Story', title: 'The Raised Voice' },
    { img: 'cards/brother.jpg', kind: 'Story', title: 'The Brother' },
    { img: 'cards/offer.jpg', kind: 'Story', title: 'The Offer' },
  ],
  quizzes: ['How well do you know me?', 'Guess my answer', 'Money', 'Family', 'Would you rather?'],

  // The site's own translations of pillar 4's title.
  languages: [
    'Building relationships that last.', 'علاقات تدوم.', 'دیرپا رشتے بنانا۔', 'Kalıcı ilişkiler kurmak.',
    'Membangun hubungan yang langgeng.', 'Construire une relation qui dure.', 'দীর্ঘস্থায়ী সম্পর্ক গড়া।', 'Dhisidda xiriir waara.',
  ],

  // Fallback when a film has no track of its own (each film below has one).
  music: { src: '', volume: 0.55 },

  // The two films. Each line of copy can be edited here or with the editor.
  // Film A follows Zayd (his introductions are women), film B follows Amina
  // (hers are men); each film also turns round to the other side once.
  // card1..card6 are the full-screen pink messages between segments: the
  // first line, then the second in its place.
  versions: {
    a: {
      label: 'A · Cinematic',
      // Track 2 at 117.5 BPM. It starts so its lift (0:07.32) lands on
      // "There’s a better way", over its quiet opening before that.
      music: { src: 'audio/AppWalkthruMusic2.mp3', lift: 7.316, beat: 0.5108, volume: 0.9 },
      // *Asterisks* mark the words to emphasise: they land a beat late.
      // card1..card6 are the full-screen pink messages: the first line, then
      // the second in its place. Each stays up long enough to read.
      copy: {
        problem: 'Hours of swiping.', problem2: 'Still no one *serious* about marriage.',
        card1a: 'There’s a *better* way.', card1b: 'Meet *Halal Mode*.',
        card2a: '*Quality* over quantity.', card2b: '*Five* carefully chosen introductions, every Fajr.',
        card3a: 'Attraction matters. So does *privacy*.', card3b: 'Not mutual? They’re *never told*.',
        card4a: '*Earn* the conversation.', card4b: 'Answer each other’s questions *first*. Then talk.',
        card5a: 'Built to *last*.', card5b: '*35* Halal Cards for the two of you.',
        // A spare message: add card(6) to film A's list in engine.js story() to use it.
        card6a: 'Safe by *design*.', card6b: 'Block or report anytime. Photos stay *private*.',
        notification: 'Your five introductions are here.',
        p3Reveal: 'Seen only once you’ve both answered.',
        close: 'Marriage, taken seriously.', offer: '1 month of Premium free for the first 10,000', url: 'halalmo.de',
      },
    },
    b: {
      label: 'B · The thread',
      // Track 1 at 123 BPM. It starts wherever puts its drop (0:15.6) on the
      // moment the phone lands, so the messages play over its quiet intro.
      music: { src: 'audio/AppWalkthruMusic1.mp3', drop: 15.6, beat: 0.4876, volume: 0.9 },
      // The story is told as a text conversation between Amina ("Me") and her
      // brother Ilyas: one message per line, "Name: text". *Asterisks* mark
      // the words to emphasise.
      copy: {
        thread1: `Ilyas: Any luck on the apps?
Me: Hours of swiping. Nobody *serious*.
Ilyas: Same. Have you tried *Halal Mode*?`,
        notification: 'Your five introductions are here.',
        thread2: `Ilyas: Only five a day?
Me: Five *chosen* ones. Every Fajr.`,
        thread3: `Ilyas: What if you like someone?
Me: They’re only told if it’s *mutual*.`,
        thread4: `Ilyas: When do you actually talk?
Me: Once we’ve *both* answered.`,
        p3Reveal: 'Both answered. Both revealed.',
        thread5: `Ilyas: And if it works out?
Me: *35* Halal Cards. For the marriage itself.`,
        close: 'Join the waitlist.', offer: 'First 10,000 get 1 month of Premium free', url: 'halalmo.de',
      },
    },
    c: {
      label: 'C · The explainer',
      // Track 2 again, from a different place: its quiet breakdown sits under
      // "The result?", and the build after it (0:72.7) starts on the turn.
      music: { src: 'audio/AppWalkthruMusic2.mp3', beat: 0.5108, volume: 0.85, cue: 72.69, cueScene: 'turn' },
      // A flat, simple explainer: the problem (too much choice, swiping for
      // the ego), then another way. Each scene's lines show one after another;
      // *asterisks* mark the words to emphasise.
      copy: {
        crowd: `More people than ever, one swipe away.
So why is it so hard to choose *one*?`,
        jarsKicker: 'The paradox of choice',
        jars: `A famous study set out jam for shoppers.
24 flavours: *3%* bought.
6 flavours: *30%* bought.
More choice. *Fewer* decisions.`,
        jarsSource: 'Iyengar & Lepper, 2000',
        greenerKicker: 'The grass is always greener',
        greener: `There’s always *one more* swipe.
So no one ever feels like *enough*.`,
        egoKicker: 'Ego swiping',
        ego: `Swiping for the rush of a match,
not for the *person*.`,
        cost: 'The result?',
        costWords: `Endless chats.
Ghosting.
*Burnout.*`,
        turn: `What if you saw *fewer* people,
chosen with *care*?`,
        five: `*5* introductions a day.
Choose up to *3*.
Interest is shared only if it’s *mutual*.
Then you *earn* the conversation.`,
        notification: 'Your five introductions are here.',
        close: 'Fewer options. Better choices.', offer: 'Join the waitlist: first 10,000 get 1 month of Premium free', url: 'halalmo.de',
      },
    },
  },
};
