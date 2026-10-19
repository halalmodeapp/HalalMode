import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Background Noise, two years married, not unhappy, just busy, and one of
 * them has quietly stopped sharing her day. Hidden states: connection,
 * loneliness, effort.
 */
export const backgroundNoise: Adventure = {
  id: 'adv-background-noise',
  kind: 'adventure',
  title: 'Background Noise',
  tagline: 'Not unhappy. Just busy. And she’s stopped telling him about her day.',
  description:
    'Two years in, Ibrahim and Sumayya are fine, busy jobs, full weekends, a comfortable routine. Ibrahim has not noticed that Sumayya stopped telling him about her day. Play both of them through a forgotten anniversary, a friend who listens better, and a weekend with no phones.',
  minutes: 13,
  themes: ['Feeling ignored', 'Affection', 'Small bids for attention'],
  cover: slot('concept-ignored-cover', 'cover', 'A couple on a sofa, the husband watching football and the wife talking to him while he nods without looking, an untouched slice of cake.', 'A wife talking while her husband watches TV without looking.'),
  roles: {
    A: { name: 'Ibrahim', gender: 'male', sketch: 'Kind, distracted, believes things are fine because nobody is arguing.' },
    B: { name: 'Sumayya', gender: 'female', sketch: 'Notices everything; has started keeping her day to herself.' },
  },
  variables: {
    connection: { label: 'Connection', initial: 0, readings: ['They have become housemates.', 'They are comfortably together.', 'They feel close again.'] },
    loneliness: { label: 'Loneliness', initial: 0, concerning: true, readings: ['Neither feels alone.', 'One of them feels a little alone.', 'Sumayya feels alone inside the marriage.'] },
    effort: { label: 'Effort', initial: 0, readings: ['Neither is reaching out.', 'Some effort is being made.', 'Both are choosing each other on purpose.'] },
  },
  start: 'bid',
  scenes: {
    bid: {
      id: 'bid',
      title: 'Something funny happened',
      image: slot('adv-noise-bid', 'scene', 'A woman in work clothes standing in a living room doorway starting to tell a story with animated hands, her husband on the sofa looking at a football match on TV.', 'Sumayya starting a story while Ibrahim watches TV.'),
      passages: [{ text: 'Sumayya comes home bursting with a story about her day. Ibrahim is watching the match.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What do you do?',
        choices: [
          { id: 'turn', label: 'Pause the match and turn to face her.', effects: { vars: { connection: 2 } }, next: 'later', beat: 'Ibrahim paused the match to listen.', lesson: { id: 'bn-l-bid', tag: 'Notice this', text: 'A story about her day is a bid for connection. Turning toward it is most of the marriage.' } },
          { id: 'nod', label: '“Mm-hmm,” eyes still on the screen.', effects: { vars: { loneliness: 1 } }, next: 'later', beat: 'Ibrahim nodded without looking away from the screen.' },
          { id: 'later', label: '“Tell me at half-time?”', effects: { vars: { connection: 1 }, flags: ['half_time'] }, next: 'later', beat: 'Ibrahim asked her to tell him at half-time.' },
        ],
      },
    },
    later: {
      id: 'later',
      title: 'Half-time',
      image: slot('adv-noise-later', 'scene', 'A woman alone in a bedroom scrolling her phone and smiling at a message from a friend, the TV glow and sound coming faintly from the other room.', 'Sumayya messaging a friend in the bedroom.'),
      passages: [
        { text: 'Sumayya decides what to do with the story.' },
        { text: 'Half-time comes. He has forgotten to ask.', when: { flag: 'half_time' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Sumayya. What do you do?',
        choices: [
          { id: 'retry', label: 'Try again, the story is still funny.', effects: { vars: { effort: 1, connection: 1 } }, next: 'anniversary', beat: 'Sumayya tried telling him again.' },
          { id: 'friend', label: 'Tell her friend Asma instead.', effects: { vars: { loneliness: 1 }, flags: ['asma'] }, next: 'anniversary', beat: 'Sumayya told her friend instead.' },
          { id: 'say', label: '“I feel like you don’t really hear me lately.”', effects: { vars: { effort: 1 }, flags: ['named_it'] }, next: 'anniversary', beat: 'Sumayya told him she felt unheard lately.' },
        ],
      },
    },
    anniversary: {
      id: 'anniversary',
      title: 'The date',
      turningPoint: true,
      image: slot('adv-noise-anniversary', 'turning_point', 'A woman at a kitchen table at night with two plates and a small homemade cake, one candle, checking the clock, the chair opposite empty.', 'Sumayya waiting with a small cake.'),
      passages: [
        { text: 'It is their anniversary. Sumayya made a cake. Ibrahim is working late, he forgot.' },
        { text: 'She already told him she felt unheard. It sits in the room like a third person.', when: { flag: 'named_it' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'When he gets in, what happens?',
        choices: [],
        byRole: {
          A: [
            { id: 'own', label: 'See the cake, stop, and say: “I forgot. I’m so sorry. Can we sit?”', effects: { vars: { connection: 2, effort: 1 } }, next: 'asma', beat: 'Ibrahim saw the cake and owned forgetting.' },
            { id: 'excuse', label: 'Explain about the deadline at work.', effects: { vars: { loneliness: 1 } }, next: 'asma', beat: 'Ibrahim explained about the deadline.' },
            { id: 'tomorrow', label: '“Let’s celebrate properly this weekend.”', effects: { vars: { effort: 1 } }, next: 'asma', beat: 'Ibrahim promised a proper celebration at the weekend.' },
          ],
          B: [
            { id: 'show', label: 'Tell him it hurt, and that she wants this to change.', effects: { vars: { effort: 1 } }, next: 'asma', beat: 'Sumayya told him it hurt and she wanted change.' },
            { id: 'fine', label: '“It’s fine.” Put the cake away.', effects: { vars: { loneliness: 2 }, flags: ['put_away'] }, next: 'asma', beat: 'Sumayya said it was fine and put the cake away.' },
            { id: 'cry', label: 'Cry, without explaining.', effects: { vars: { loneliness: 1 } }, next: 'asma', beat: 'Sumayya cried without explaining.' },
          ],
        },
        combos: [
          { pair: ['own', 'show'], next: 'weekend', beat: 'He owned it; she told him what it meant. They ate the cake at midnight.', effects: { vars: { connection: 2, loneliness: -1 } } },
          { pair: ['excuse', 'fine'], next: 'asma', beat: 'He explained the deadline; she said it was fine. The cake went in the bin the next day.', effects: { vars: { loneliness: 1 } } },
        ],
        diverge: 'asma',
      },
    },
    asma: {
      id: 'asma',
      title: 'A better listener',
      image: slot('adv-noise-asma', 'scene', 'Two women in hijabs at a café table, one talking and the other listening attentively with a hand on her arm, cups of coffee.', 'Sumayya confiding in her friend Asma.'),
      passages: [
        { text: 'At coffee, Sumayya’s friend Asma says, gently: “You talk to me about your day more than you talk to him, don’t you?”' },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Sumayya. What do you do with that?',
        choices: [
          { id: 'home', label: 'Go home and tell Ibrahim exactly what Asma noticed.', effects: { vars: { effort: 2 }, flags: ['told_him'] }, next: 'notices', beat: 'Sumayya went home and told Ibrahim what her friend had noticed.' },
          { id: 'keep', label: 'Keep confiding in Asma. It’s easier.', effects: { vars: { loneliness: 1 } }, next: 'notices', beat: 'Sumayya kept confiding in her friend instead of her husband.' },
        ],
      },
    },
    notices: {
      id: 'notices',
      title: 'Ibrahim notices',
      image: slot('adv-noise-notices', 'scene', 'A man sitting alone on a bed in the evening holding his phone with a thoughtful, slightly worried expression, the room quiet.', 'Ibrahim realising something is wrong.'),
      passages: [
        { text: 'Ibrahim realises he can’t remember the last thing Sumayya told him about her day.' },
        { text: 'She has just told him, plainly, what her friend noticed.', when: { flag: 'told_him' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What do you do?',
        choices: [
          { id: 'weekend', label: 'Plan a weekend away, no phones.', effects: { vars: { effort: 2 }, flags: ['planned'] }, next: 'weekend', beat: 'Ibrahim planned a weekend away with no phones.' },
          { id: 'daily', label: 'Start a small habit: ten minutes each evening, phones away, “tell me your day”.', effects: { vars: { effort: 1, connection: 1 }, flags: ['ritual'] }, next: 'weekend', beat: 'Ibrahim started a ten-minute evening ritual.' },
          { id: 'fine', label: 'Decide it’s a phase. Marriages have them.', effects: { vars: { loneliness: 1 } }, next: 'weekend', beat: 'Ibrahim decided it was just a phase.' },
        ],
      },
    },
    weekend: {
      id: 'weekend',
      title: 'No phones',
      turningPoint: true,
      image: slot('adv-noise-weekend', 'turning_point', 'A couple walking along a quiet coastal path in jackets, phones nowhere in sight, the wife laughing at something the husband said, sea in the background.', 'Ibrahim and Sumayya walking a coastal path, no phones.'),
      passages: [{ text: 'A weekend with no phones, whether planned or simply because the signal is bad at her parents’ village.' }],
      lessons: [{ id: 'bn-l-joint', tag: 'Joint decision', text: 'Choose together; if you differ, talk it through and choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what do you bring home from the weekend?',
        choices: [
          { id: 'ritual', label: 'A daily ten minutes: phones down, “tell me your day”.', effects: { vars: { connection: 2, effort: 1 }, flags: ['kept_ritual'] }, next: 'month_later', beat: 'They brought home a daily ten minutes together.' },
          { id: 'dates', label: 'A monthly evening out, just them.', effects: { vars: { connection: 1, effort: 1 }, flags: ['dates'] }, next: 'month_later', beat: 'They agreed a monthly evening out.' },
          { id: 'nothing', label: 'A lovely memory. Back to normal on Monday.', effects: { vars: { loneliness: 1 } }, next: 'month_later', beat: 'They came home with a lovely memory and changed nothing.' },
        ],
      },
    },
    month_later: {
      id: 'month_later',
      title: 'A month later',
      image: slot('adv-noise-month', 'scene', 'A woman coming in through a front door after work, her husband looking up from a book on the sofa and closing it, smiling to listen.', 'Ibrahim closing his book as Sumayya comes home.'),
      passages: [{ text: 'A month later, Sumayya comes home with another funny story.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What happens?',
        choices: [
          { id: 'close_book', label: 'Close his book. “Go on, tell me.”', effects: { vars: { connection: 1 } }, next: { routes: endingRoutes() }, beat: 'Ibrahim put everything down to hear her story.' },
          { id: 'phone', label: 'Listen while finishing an email.', effects: { vars: { loneliness: 1 } }, next: { routes: endingRoutes() }, beat: 'Ibrahim half-listened while finishing an email.' },
        ],
      },
    },
  },
  endings: {
    close: {
      id: 'close', title: 'Close again', mood: 'renewed',
      image: slot('adv-noise-end-close', 'outcome', 'A couple sitting on their kitchen floor late at night laughing together over tea, leaning on cupboards, completely at ease.', 'Ibrahim and Sumayya laughing on the kitchen floor.'),
      whatHappened: 'Ten minutes a day became the best part of both their days.',
      pattern: { name: 'Turning toward bids', explanation: 'Small, daily attention rebuilt what busyness had worn down.' },
      couldHaveChanged: 'Noticing the first unshared story.',
      takeaway: 'Marriages rarely end in one fight. They fade from ignored small moments, and recover the same way.',
      epilogues: [{ text: 'Asma says Sumayya seems happier. She is.', when: { flag: 'asma' } }],
      guide: [{ id: 'bn-e-ten', text: 'Ten minutes a day, phones down: “tell me about your day”.' }],
    },
    housemates: {
      id: 'housemates', title: 'Good housemates', mood: 'fragile',
      image: slot('adv-noise-end-housemates', 'outcome', 'Two people in the same flat doing separate things, one cooking, one on a laptop, back to back, pleasant but distant.', 'Ibrahim and Sumayya doing separate things, back to back.'),
      whatHappened: 'They are kind to each other and share very little. Sumayya’s best friend knows her better than her husband does.',
      pattern: { name: 'Turning away', explanation: 'Many small missed moments added up to distance without a single fight.' },
      couldHaveChanged: 'Pausing the match. Seeing the cake. Saying “tell me”.',
      takeaway: 'No arguments does not mean no problems.',
      epilogues: [{ text: 'Sumayya has stopped trying to tell him things at all.', when: { var: 'effort', lte: 0 } }],
      guide: [{ id: 'bn-e-turn', text: 'We turn toward each other’s small moments.' }],
    },
    alone: {
      id: 'alone', title: 'Alone together', mood: 'strained',
      image: slot('adv-noise-end-alone', 'outcome', 'A woman sitting alone at a window at night with a cup of tea, the reflection of her husband asleep on the sofa behind her.', 'Sumayya alone at the window at night.'),
      whatHappened: 'Sumayya feels lonelier married than she ever did single.',
      pattern: { name: 'Emotional absence', explanation: 'Presence in the same house is not the same as presence in someone’s life.' },
      couldHaveChanged: 'Ibrahim noticing; Sumayya saying it out loud.',
      takeaway: 'Loneliness inside a marriage is a warning, not a phase.',
      guide: [{ id: 'bn-e-alone', text: 'If either of us feels alone, we say so, and the other stops everything.' }],
    },
    honest_cake: {
      id: 'honest_cake', title: 'Cake at midnight', mood: 'tender',
      image: slot('adv-noise-end-cake', 'outcome', 'A couple sharing a small cake at a kitchen table at midnight, one candle lit, holding forks, smiling softly.', 'Ibrahim and Sumayya sharing cake at midnight.'),
      whatHappened: 'The forgotten anniversary became the night they started really talking again.',
      pattern: { name: 'Repair after a miss', explanation: 'He owned it; she said what it meant. The miss became a turning point.' },
      couldHaveChanged: 'Not forgetting, but the repair mattered more.',
      takeaway: 'You will forget things. What matters is the repair.',
      guide: [{ id: 'bn-e-repair', text: 'When one of us forgets something important, we own it without excuses.' }],
    },
    dates: {
      id: 'dates', title: 'First Fridays', mood: 'steady',
      image: slot('adv-noise-end-dates', 'outcome', 'A couple sitting across a small restaurant table by a window, talking happily, a modest meal between them.', 'Ibrahim and Sumayya at their monthly dinner.'),
      whatHappened: 'The first Friday of every month is theirs. The other days are still a bit busy.',
      pattern: { name: 'Scheduled connection', explanation: 'A protected monthly time helped, though daily attention still slips.' },
      couldHaveChanged: 'Small daily moments as well as monthly ones.',
      takeaway: 'Big gestures help; small daily ones matter more.',
      epilogues: [{ text: 'Some evenings Ibrahim still half-listens; Sumayya says so now.', when: { flag: 'named_it' } }],
      guide: [{ id: 'bn-e-dates', text: 'We keep a regular evening that belongs only to us.' }],
    },
    named: {
      id: 'named', title: 'She said it out loud', mood: 'tender',
      image: slot('adv-noise-end-named', 'outcome', 'A husband and wife sitting on the edge of a bed facing each other, holding hands, in a frank but gentle conversation.', 'Ibrahim and Sumayya holding hands in a frank talk.'),
      whatHappened: 'Because Sumayya said “I feel unheard” before it became “I feel alone”, there was still time.',
      pattern: { name: 'Raising it early', explanation: 'Naming the feeling early gave him the chance to change.' },
      couldHaveChanged: 'Little.',
      takeaway: 'Say “I feel unheard” long before you feel alone.',
      guide: [{ id: 'bn-e-early', text: 'We say when we feel unheard, before it grows.' }],
    },
    phase: {
      id: 'phase', title: 'Just a phase?', mood: 'bittersweet',
      image: slot('adv-noise-end-phase', 'outcome', 'A couple on a sofa each on their own phone, sitting close but not touching, soft evening light, comfortable yet distant.', 'Ibrahim and Sumayya on their phones, close but apart.'),
      whatHappened: 'It might have been a phase. It might be the start of a long drift. Neither can tell yet.',
      pattern: { name: 'Waiting it out', explanation: 'Hoping distance resolves itself rarely works.' },
      couldHaveChanged: 'A small daily habit instead of waiting.',
      takeaway: 'Drift is the default. Closeness takes choosing.',
      guide: [{ id: 'bn-e-choose', text: 'We choose each other on purpose, especially when life is busy.' }],
    },
    fine: {
      id: 'fine', title: 'Fine, mostly', mood: 'steady',
      image: slot('adv-noise-end-fine', 'outcome', 'A couple washing up together at a sink, one washing, one drying, chatting casually.', 'Ibrahim and Sumayya washing up together.'),
      whatHappened: 'Not close, not distant. They have noticed the drift, which is more than most do.',
      pattern: { name: 'Noticed, not yet fixed', explanation: 'Awareness is the first step; habit is the second.' },
      couldHaveChanged: 'Turning the weekend into a lasting habit.',
      takeaway: 'Noticing the drift is good. Doing something small every day is better.',
      epilogues: [{ text: 'The loneliness is still there, quieter now.', when: { var: 'loneliness', gte: 2 } }],
      guide: [{ id: 'bn-e-small', text: 'We do one small thing for each other every day.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ var: 'loneliness', gte: 5 }, { var: 'effort', lte: 1 }] }, to: 'end:alone' },
    { when: { all: [{ var: 'loneliness', gte: 3 }, { var: 'connection', lte: 1 }] }, to: 'end:housemates' },
    { when: { all: [{ flag: 'kept_ritual' }, { var: 'connection', gte: 4 }] }, to: 'end:close' },
    { when: { all: [{ flag: 'named_it' }, { var: 'effort', gte: 3 }] }, to: 'end:named' },
    { when: { flag: 'dates' }, to: 'end:dates' },
    { when: { var: 'connection', gte: 5 }, to: 'end:honest_cake' },
    { when: { var: 'loneliness', gte: 2 }, to: 'end:phase' },
    { to: 'end:fine' },
  ];
}
