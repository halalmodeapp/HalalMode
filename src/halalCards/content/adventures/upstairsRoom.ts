import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Upstairs Room — newlyweds living with his parents to save for a home.
 * Hidden states: privacy, family, partnership.
 */
export const upstairsRoom: Adventure = {
  id: 'adv-upstairs-room',
  kind: 'adventure',
  title: 'The Upstairs Room',
  tagline: 'One room, no lock, and a mother-in-law with a key to everything.',
  description:
    'To save for a deposit, Yahya and Sumaya move into the upstairs room at his parents’ house. It was meant to be a year. Play both of them through overheard conversations, kitchen politics and a moving-out date that keeps slipping — and decide what a couple needs to stay a couple under someone else’s roof.',
  minutes: 14,
  themes: ['Living with in-laws', 'Boundaries', 'Marriage roles', 'Money'],
  cover: slot('concept-house-cover', 'cover', 'A family staircase with a young couple’s door at the top slightly ajar, a mother’s hand on the banister below.', 'A family staircase leading to the couple’s room.'),
  roles: {
    A: { name: 'Yahya', gender: 'male', sketch: 'An only son; grateful to his parents, conflict-averse.' },
    B: { name: 'Sumaya', gender: 'female', sketch: 'Independent; agreed to the plan for the deposit, and is starting to feel like a guest.' },
  },
  variables: {
    privacy: { label: 'Privacy as a couple', initial: 0, readings: ['They have no space of their own.', 'They have some space.', 'Their marriage has a protected corner.'] },
    family: { label: 'Family warmth', initial: 0, readings: ['The household is tense.', 'The household is cordial.', 'The household feels warm.'] },
    partnership: { label: 'Partnership', initial: 0, readings: ['Sumaya feels alone in the house.', 'They are mostly a team.', 'They face the house together.'] },
  },
  start: 'knock',
  scenes: {
    knock: {
      id: 'knock',
      title: 'The knock that isn’t',
      image: slot('adv-house-knock', 'scene', 'A young couple’s bedroom door opening without a knock, an older woman stepping in holding folded laundry, the young wife sitting up surprised in a loose hijab.', 'Yahya’s mother walking in with laundry.'),
      passages: [{ text: 'Week three. Yahya’s mother walks into their room with folded laundry — without knocking — for the fourth time.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Sumaya. What do you do?',
        choices: [
          { id: 'tell_yahya', label: 'Tell Yahya that evening and ask him to raise it.', effects: { vars: { partnership: 1 } }, next: 'yahya_mum', beat: 'Sumaya asked Yahya to raise the knocking with his mother.' },
          { id: 'direct', label: 'Say to his mother kindly: “Could you knock first? I’m not always dressed.”', effects: { vars: { privacy: 1, family: -1 } }, next: 'kitchen', beat: 'Sumaya asked her mother-in-law directly to knock.' },
          { id: 'endure', label: 'Say nothing. It’s their house.', effects: { vars: { privacy: -1 }, flags: ['enduring'] }, next: 'kitchen', beat: 'Sumaya said nothing because it was their house.', lesson: { id: 'ur-l-endure', tag: 'Pattern forming', text: 'Feeling like a guest in your own marriage is a small thing that grows.' } },
        ],
      },
    },
    yahya_mum: {
      id: 'yahya_mum',
      title: 'A word with Mum',
      image: slot('adv-house-mum', 'scene', 'A man and his mother in a kitchen, him leaning against the counter speaking gently, her stirring a pot with a slightly hurt expression.', 'Yahya talking with his mother in the kitchen.'),
      passages: [{ text: 'Yahya finds his mother in the kitchen. He hates this.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yahya. How do you put it?',
        choices: [
          { id: 'own', label: '“Mum, could you knock on our door? It matters to me.”', effects: { vars: { privacy: 2, partnership: 1 } }, next: 'kitchen', beat: 'Yahya asked his mother to knock, as his own request.' },
          { id: 'blame', label: '“Sumaya says you should knock.”', effects: { vars: { family: -2, privacy: 1 }, flags: ['blamed'] }, next: 'kitchen', beat: 'Yahya told his mother the request came from Sumaya.', lesson: { id: 'ur-l-messenger', tag: 'Notice this', text: 'Passing on a request as your spouse’s puts them between you and your parent.' } },
          { id: 'skip', label: 'Chat about dinner and lose his nerve.', effects: { vars: { partnership: -1 } }, next: 'kitchen', beat: 'Yahya lost his nerve and never raised it.' },
        ],
      },
    },
    kitchen: {
      id: 'kitchen',
      title: 'Whose kitchen',
      image: slot('adv-house-kitchen', 'scene', 'A family kitchen with an older woman reorganising jars on a shelf while a young woman holds a cookbook, both trying to be polite, tension in their postures.', 'Sumaya and her mother-in-law in the kitchen.'),
      passages: [
        { text: 'Sumaya cooks dinner for the family. Her mother-in-law quietly re-seasons it.' },
        { text: 'Since the knocking conversation, things have been chilly.', when: { flag: 'blamed' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Sumaya. What do you do?',
        choices: [
          { id: 'together', label: 'Suggest they cook together on Fridays.', effects: { vars: { family: 2 } }, next: 'overheard', beat: 'Sumaya suggested cooking together on Fridays.' },
          { id: 'retreat', label: 'Stop cooking. Let her run the kitchen.', effects: { vars: { privacy: -1, family: 1 }, flags: ['retreated'] }, next: 'overheard', beat: 'Sumaya stopped cooking and left the kitchen to her mother-in-law.' },
          { id: 'mention', label: 'Mention to Yahya, without drama, that it stung.', effects: { vars: { partnership: 1 } }, next: 'overheard', beat: 'Sumaya told Yahya calmly that the re-seasoning stung.' },
        ],
      },
    },
    overheard: {
      id: 'overheard',
      title: 'Through the wall',
      turningPoint: true,
      image: slot('adv-house-overheard', 'turning_point', 'A young couple in their bedroom at night sitting up, frozen, looking at the wall as voices of older parents are heard from the next room, a lamp on.', 'Yahya and Sumaya overhearing through the wall.'),
      passages: [{ text: 'Late at night, through the wall: his father saying, “When are they actually leaving? She acts like a guest.”' }],
      decision: {
        mode: 'private',
        prompt: 'What do you do, in that moment?',
        choices: [],
        byRole: {
          A: [
            { id: 'hold', label: 'Take Sumaya’s hand: “I heard it too. We’ll talk tomorrow.”', effects: { vars: { partnership: 2 } }, next: 'savings', beat: 'Yahya took Sumaya’s hand and said they would talk tomorrow.' },
            { id: 'defend_dad', label: 'Whisper: “He didn’t mean it like that.”', effects: { vars: { partnership: -1 } }, next: 'savings', beat: 'Yahya defended his father’s words.' },
            { id: 'pretend', label: 'Pretend he didn’t hear.', effects: { vars: { partnership: -1 }, flags: ['pretended'] }, next: 'savings', beat: 'Yahya pretended he had not heard.' },
          ],
          B: [
            { id: 'cry', label: 'Turn to Yahya, hurt.', effects: { vars: { partnership: 1 } }, next: 'savings', beat: 'Sumaya turned to Yahya, hurt.' },
            { id: 'cold', label: 'Turn away and say nothing.', effects: { vars: { privacy: -1 } }, next: 'savings', beat: 'Sumaya turned away in silence.' },
            { id: 'leave_now', label: '“We need to leave. Soon.”', effects: { flags: ['urgent'] }, next: 'savings', beat: 'Sumaya said they needed to leave soon.' },
          ],
        },
        combos: [
          { pair: ['hold', 'cry'], next: 'savings', beat: 'She turned to him, and he was already reaching for her hand.', effects: { vars: { partnership: 2 } } },
          { pair: ['pretend', 'cold'], next: 'savings', beat: 'Both pretended. Both lay awake.', effects: { vars: { partnership: -1, privacy: -1 } } },
          { pair: ['defend_dad', 'leave_now'], next: 'savings', beat: 'He defended his father; she said they had to leave. Neither slept.', effects: { vars: { partnership: -2 } } },
        ],
        diverge: 'savings',
      },
    },
    savings: {
      id: 'savings',
      title: 'The savings account',
      image: slot('adv-house-savings', 'scene', 'A couple sitting on a bed with a laptop showing a simple savings bar chart, calculator and notebook, serious faces.', 'Yahya and Sumaya looking at their savings.'),
      passages: [
        { text: 'They look at the savings. Eight months in, they are behind — Yahya has been quietly paying some of his parents’ bills.' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yahya. How do you tell her?',
        choices: [
          { id: 'honest', label: 'Tell her plainly, and ask how she feels about it.', effects: { vars: { partnership: 1 } }, next: 'deadline', beat: 'Yahya told Sumaya plainly about paying his parents’ bills.' },
          { id: 'justify', label: '“They’re my parents. What was I supposed to do?”', effects: { vars: { partnership: -1 } }, next: 'deadline', beat: 'Yahya defended paying his parents’ bills without asking her.' },
        ],
      },
    },
    deadline: {
      id: 'deadline',
      title: 'A date on the calendar',
      turningPoint: true,
      image: slot('adv-house-deadline', 'turning_point', 'A wall calendar in a bedroom with a date circled in red marker, a young couple’s hands visible, one holding the marker.', 'A move-out date circled on the calendar.'),
      passages: [
        { text: 'They need a plan.' },
        { text: 'Sumaya has already said it: they need to leave soon.', when: { flag: 'urgent' } },
      ],
      lessons: [{ id: 'ur-l-joint', tag: 'Joint decision', text: 'Choose together; if you differ, talk and choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what’s the plan?',
        choices: [
          { id: 'date', label: 'Set a firm moving-out date in six months, and tell his parents together.', effects: { vars: { partnership: 2 }, flags: ['firm_date'] }, next: 'tell_parents', beat: 'They set a firm move-out date and agreed to tell his parents together.' },
          { id: 'rules', label: 'Stay longer, but agree house rules with his parents.', effects: { vars: { privacy: 2, family: 1 }, flags: ['house_rules'] }, next: 'tell_parents', beat: 'They chose to stay longer with agreed house rules.' },
          { id: 'rent', label: 'Rent a small flat now, even if the deposit takes longer.', effects: { vars: { privacy: 3, family: -1 }, flags: ['rented'] }, next: 'tell_parents', beat: 'They chose to rent a small flat right away.' },
        ],
      },
    },
    tell_parents: {
      id: 'tell_parents',
      title: 'Telling his parents',
      image: slot('adv-house-tell', 'scene', 'A young couple sitting together on one sofa facing his seated parents in a living room, tea on the table, the son speaking calmly.', 'Yahya and Sumaya talking with his parents.'),
      passages: [{ text: 'They sit down with his parents in the living room.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yahya. How do you begin?',
        choices: [
          { id: 'grateful', label: '“We’re so grateful for this year. Here’s what we’ve decided, together.”', effects: { vars: { family: 2 } }, next: { routes: endingRoutes() }, beat: 'Yahya began with gratitude and spoke for them both.' },
          { id: 'sumaya', label: 'Let Sumaya explain — it’s mostly her wish.', effects: { vars: { family: -1, partnership: -1 } }, next: { routes: endingRoutes() }, beat: 'Yahya let Sumaya explain the decision alone.' },
        ],
      },
    },
  },
  endings: {
    own_door: {
      id: 'own_door', title: 'Their own front door', mood: 'renewed',
      image: slot('adv-house-end-door', 'outcome', 'A young couple standing at the front door of a small new flat with a single moving box, the man holding up a key, both smiling.', 'Yahya and Sumaya at their own front door.'),
      whatHappened: 'Six months later they carry the last box out. His parents cry, then come for Friday dinner every week.',
      pattern: { name: 'United and grateful', explanation: 'They left as a team, with gratitude, so leaving did not feel like rejection.' },
      couldHaveChanged: 'Setting the date on day one.',
      takeaway: 'Gratitude and boundaries can be said in the same breath.',
      guide: [{ id: 'ur-e-door', text: 'We speak to our families as one, with gratitude first.' }],
    },
    rules: {
      id: 'rules', title: 'House rules', mood: 'steady',
      image: slot('adv-house-end-rules', 'outcome', 'A small handwritten note taped to a bedroom door saying nothing readable, a mother knocking politely, a young woman opening the door with a smile.', 'His mother knocking politely on their door.'),
      whatHappened: 'They stay another year. His mother knocks now. Fridays, the two women cook together.',
      pattern: { name: 'Agreed boundaries', explanation: 'Clear rules made a shared house livable.' },
      couldHaveChanged: 'Agreeing them before moving in.',
      takeaway: 'Living with family works best with rules agreed before the first problem.',
      epilogues: [{ text: 'Sumaya still counts the days until they move — but without bitterness.', when: { var: 'privacy', lte: 1 } }],
      guide: [{ id: 'ur-e-rules', text: 'If we share a home with family, we agree house rules first.' }],
    },
    small_flat: {
      id: 'small_flat', title: 'A small flat, a big relief', mood: 'tender',
      image: slot('adv-house-end-flat', 'outcome', 'A young couple sitting on the floor of a tiny flat eating takeaway from boxes, no furniture yet, laughing.', 'Yahya and Sumaya eating takeaway on the floor of a tiny flat.'),
      whatHappened: 'The deposit takes two more years. They don’t regret it for a day.',
      pattern: { name: 'Marriage over money', explanation: 'They decided their privacy was worth more than speed.' },
      couldHaveChanged: 'Telling his parents more warmly would have eased the hurt.',
      takeaway: 'Some savings cost too much.',
      epilogues: [{ text: 'His parents take a while to forgive the speed of it.', when: { var: 'family', lte: 0 } }],
      guide: [{ id: 'ur-e-worth', text: 'We weigh our marriage’s needs alongside our savings.' }],
    },
    guest: {
      id: 'guest', title: 'A guest in her marriage', mood: 'strained',
      image: slot('adv-house-end-guest', 'outcome', 'A young woman sitting alone on the edge of a bed in a small room with her suitcase still half unpacked in the corner, looking out of the window.', 'Sumaya alone, suitcase still half unpacked.'),
      whatHappened: 'Two years on, they still live upstairs. Sumaya has never unpacked the second suitcase.',
      pattern: { name: 'Silent accommodation', explanation: 'Each small thing was endured, and the endurance became the marriage.' },
      couldHaveChanged: 'Yahya speaking up — in his own voice — about the smallest thing.',
      takeaway: 'Your spouse should never feel like a guest in your marriage.',
      guide: [{ id: 'ur-e-guest', text: 'We make sure neither of us feels like a guest at home.' }],
    },
    between: {
      id: 'between', title: 'Caught between', mood: 'fragile',
      image: slot('adv-house-end-between', 'outcome', 'A man standing in a hallway between two closed doors, one leading to his parents’ room, one to his and his wife’s, looking torn.', 'Yahya standing between two doors.'),
      whatHappened: 'Yahya relays complaints in both directions. Everyone is a little angry with him, and with each other.',
      pattern: { name: 'The messenger', explanation: 'Speaking for his wife instead of with her made him the channel for every grievance.' },
      couldHaveChanged: 'Making requests as his own, and speaking to his parents with Sumaya beside him.',
      takeaway: 'Do not be the messenger between your spouse and your parents. Be the bridge.',
      guide: [{ id: 'ur-e-bridge', text: 'Requests to family come from both of us, in our own voices.' }],
    },
    warm_house: {
      id: 'warm_house', title: 'A warm house', mood: 'tender',
      image: slot('adv-house-end-warm', 'outcome', 'Two generations at a dinner table laughing together, an older woman passing a dish to her daughter-in-law, warm lamp light.', 'The whole family laughing at dinner.'),
      whatHappened: 'Against the odds, the house becomes a real home for all four of them.',
      pattern: { name: 'Turning toward family', explanation: 'Sumaya’s invitations and Yahya’s honesty built real warmth.' },
      couldHaveChanged: 'A clearer moving-out date might still be wise.',
      takeaway: 'Warmth is built by invitations, not just boundaries.',
      guide: [{ id: 'ur-e-warm', text: 'We build warmth with family on purpose.' }],
    },
    hurt_leaving: {
      id: 'hurt_leaving', title: 'Leaving on a sour note', mood: 'bittersweet',
      image: slot('adv-house-end-sour', 'outcome', 'A young couple loading boxes into a car outside a house while an older couple watch from the doorway with folded arms.', 'His parents watching them load the car.'),
      whatHappened: 'They move out. His parents feel blamed; Sumaya feels blamed for leaving.',
      pattern: { name: 'Leaving without unity', explanation: 'The decision was right, but Yahya let Sumaya carry it alone.' },
      couldHaveChanged: 'Yahya standing beside her and owning the decision too.',
      takeaway: 'A shared decision should be defended by both of you.',
      guide: [{ id: 'ur-e-own', text: 'We both own our shared decisions in front of family.' }],
    },
    patience: {
      id: 'patience', title: 'Patience, for now', mood: 'steady',
      image: slot('adv-house-end-patience', 'outcome', 'A couple on a small balcony of a family house at dusk, sharing tea, talking quietly with their heads close.', 'Yahya and Sumaya talking quietly on the balcony.'),
      whatHappened: 'They are still upstairs, still saving, still finding small ways to be a couple in a shared house.',
      pattern: { name: 'Making do together', explanation: 'They did not fix the house, but they protected some evenings for themselves.' },
      couldHaveChanged: 'A clearer plan and date.',
      takeaway: 'A temporary arrangement needs a real end date.',
      guide: [{ id: 'ur-e-date', text: 'Temporary arrangements get a real end date.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ flag: 'enduring' }, { var: 'partnership', lte: 0 }] }, to: 'end:guest' },
    { when: { all: [{ flag: 'blamed' }, { var: 'family', lte: -1 }] }, to: 'end:between' },
    { when: { var: 'partnership', lte: -2 }, to: 'end:hurt_leaving' },
    { when: { all: [{ flag: 'firm_date' }, { var: 'family', gte: 1 }] }, to: 'end:own_door' },
    { when: { flag: 'rented' }, to: 'end:small_flat' },
    { when: { all: [{ var: 'family', gte: 4 }, { var: 'partnership', gte: 2 }] }, to: 'end:warm_house' },
    { when: { flag: 'house_rules' }, to: 'end:rules' },
    { to: 'end:patience' },
  ];
}
