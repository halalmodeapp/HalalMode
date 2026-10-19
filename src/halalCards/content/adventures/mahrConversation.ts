import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Mahr Conversation, an engagement, two fathers, and a figure that
 * becomes a test of whose voice counts. Hidden states: partnership, family,
 * voice (whether the bride's own wishes lead).
 */
export const mahrConversation: Adventure = {
  id: 'adv-mahr-conversation',
  kind: 'adventure',
  title: 'The Mahr Conversation',
  tagline: 'Two fathers, one number, and a bride nobody has asked.',
  description:
    'Faris and Layla are newly engaged. Her father names a mahr his family finds insulting; his father names one hers finds insulting back. Play both of them through the week the families negotiate, and decide whether the couple has a voice in their own beginning.',
  minutes: 14,
  themes: ['Mahr', 'Family pressure', 'Engagement'],
  cover: slot('concept-mahr-cover', 'cover', 'Two older men across a formal living room, tea untouched, a young couple watching nervously from the doorway.', 'Two fathers in tense conversation while the couple watch.'),
  roles: {
    A: { name: 'Faris', gender: 'male', sketch: 'A teacher; respects his father, has modest savings.' },
    B: { name: 'Layla', gender: 'female', sketch: 'A pharmacist; knows exactly what the mahr means to her.' },
  },
  variables: {
    partnership: { label: 'Partnership', initial: 0, readings: ['They are watching their families decide.', 'They are finding their voice together.', 'They are deciding as a couple.'] },
    family: { label: 'Family goodwill', initial: 0, readings: ['The families are bruised.', 'The families are cordial.', 'The families feel joined.'] },
    voice: { label: 'Layla’s voice', initial: 0, readings: ['Layla’s wishes were spoken over.', 'Layla was partly heard.', 'Layla’s own wishes led the decision.'] },
  },
  start: 'figures',
  scenes: {
    figures: {
      id: 'figures',
      title: 'Two numbers',
      image: slot('adv-mahr-figures', 'scene', 'A formal living room with two older men on opposite sofas, a tea tray between them, one holding up a hand as if naming a figure, mothers sitting stiffly, an engaged couple on the edge of the frame.', 'The two fathers naming figures in the living room.'),
      passages: [
        { text: 'The first formal visit. Layla’s father names a mahr. The room goes quiet. Faris’s father names a much smaller one. The room goes colder.' },
        { text: 'Nobody has asked Layla. Nobody has asked Faris what he can actually afford.' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Faris. What do you do in the room?',
        choices: [
          { id: 'ask_layla', label: '“With respect, could we hear what Layla would like?”', effects: { vars: { voice: 2, partnership: 1, family: -1 }, flags: ['faris_asked'] }, next: 'drive_home', beat: 'Faris asked, in front of both families, what Layla wanted.', lesson: { id: 'mh-l-ask', tag: 'Notice this', text: 'The mahr is the bride’s right. Asking her is not rudeness, it is the point.' } },
          { id: 'silent', label: 'Stay quiet, this is for the elders.', effects: { vars: { voice: -1 } }, next: 'drive_home', beat: 'Faris stayed quiet and let the elders talk.' },
          { id: 'side_father', label: 'Back his father: “We have to be realistic.”', effects: { vars: { family: -1, partnership: -1 } }, next: 'drive_home', beat: 'Faris backed his father’s figure in the room.' },
        ],
      },
    },
    drive_home: {
      id: 'drive_home',
      title: 'The drive home',
      image: slot('adv-mahr-drive', 'scene', 'A young woman in the back seat of a car at night beside her mother, looking at her phone, city lights through the window.', 'Layla looking at her phone on the drive home.'),
      passages: [
        { text: 'In the car, Layla’s mother is furious. Layla’s phone buzzes: Faris.' },
        { text: 'She is still a little stunned that he asked what she wanted.', when: { flag: 'faris_asked' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Layla. What do you do?',
        choices: [
          { id: 'call', label: 'Call Faris tonight: “We need to talk, just us.”', effects: { vars: { partnership: 1 } }, next: 'just_us', beat: 'Layla called Faris that night so they could talk alone.' },
          { id: 'mother', label: 'Let her mother vent, and agree with everything.', effects: { vars: { family: -1, voice: -1 } }, next: 'fathers_meet', beat: 'Layla let her mother’s anger set the tone.' },
          { id: 'text', label: 'Text: “I don’t care about the number. I care that nobody asked me.”', effects: { vars: { voice: 1, partnership: 1 }, flags: ['said_it'] }, next: 'just_us', beat: 'Layla told Faris what hurt was not the number but not being asked.' },
        ],
      },
    },
    fathers_meet: {
      id: 'fathers_meet',
      title: 'The fathers meet alone',
      image: slot('adv-mahr-fathers', 'scene', 'Two older bearded men sitting at a café table outdoors, one leaning back with folded arms, one gesturing firmly, cups of coffee untouched.', 'The two fathers meeting alone at a café.'),
      passages: [{ text: 'Without telling the couple, the two fathers meet to “settle it like men”. Faris hears about it afterwards.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Faris. What do you do?',
        choices: [
          { id: 'step_in', label: 'Tell his father: “Layla and I will settle the mahr together.”', effects: { vars: { partnership: 1, family: -1, voice: 1 } }, next: 'just_us', beat: 'Faris told his father the couple would settle the mahr themselves.' },
          { id: 'accept', label: 'Accept whatever they agree.', effects: { vars: { voice: -2 }, flags: ['fathers_decided'] }, next: 'leak', beat: 'Faris accepted whatever the fathers agreed.' },
        ],
      },
    },
    just_us: {
      id: 'just_us',
      title: 'Just the two of us',
      image: slot('adv-mahr-just-us', 'scene', 'An engaged couple on a phone video call, each in their own family home, both leaning toward their screens, sincere expressions.', 'Faris and Layla talking on a video call.'),
      passages: [
        { text: 'For the first time, they talk about the mahr without anyone else in the room.' },
        { text: 'Layla explains that what stung was being spoken about, not spoken to.', when: { flag: 'said_it' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What does the mahr mean to you? Answer for yourself.',
        choices: [],
        byRole: {
          A: [
            { id: 'means', label: 'An honour I want to give properly, even if it takes time.', effects: { vars: { voice: 1 } }, next: 'leak', beat: 'Faris said the mahr was an honour he wanted to give properly.' },
            { id: 'afford', label: 'Honestly, a worry: I can only afford so much.', effects: { vars: { partnership: 1 }, flags: ['faris_honest'] }, next: 'leak', beat: 'Faris admitted what he could actually afford.' },
            { id: 'formality', label: 'A formality our families care about more than we do.', effects: { vars: { voice: -1 } }, next: 'leak', beat: 'Faris called the mahr a formality for the families.' },
          ],
          B: [
            { id: 'right', label: 'My right, and I want to choose it myself.', effects: { vars: { voice: 1 } }, next: 'leak', beat: 'Layla said the mahr was her right to choose.' },
            { id: 'symbol', label: 'A symbol. Something meaningful matters more than the amount.', effects: { flags: ['symbolic'] }, next: 'leak', beat: 'Layla said a meaningful mahr mattered more than its size.' },
            { id: 'security', label: 'Security, for a future I can’t predict.', effects: { flags: ['security'] }, next: 'leak', beat: 'Layla said the mahr was about security.' },
          ],
        },
        combos: [
          { pair: ['afford', 'symbol'], next: 'leak', beat: 'Faris admitted his limits; Layla said meaning mattered more than money. Both relaxed.', effects: { vars: { partnership: 2 } } },
          { pair: ['afford', 'security'], next: 'leak', beat: 'Faris’s honesty about money met Layla’s need for security, a real tension, finally out in the open.', effects: { vars: { partnership: 1 } } },
          { pair: ['formality', 'right'], next: 'leak', beat: 'Faris called it a formality; Layla called it her right. The call ended quietly.', effects: { vars: { partnership: -1 } } },
        ],
        diverge: 'leak',
      },
    },
    leak: {
      id: 'leak',
      title: 'The aunties hear',
      turningPoint: true,
      image: slot('adv-mahr-leak', 'turning_point', 'A busy family WhatsApp group shown as floating speech-bubble shapes around a young woman holding her phone in a kitchen, aunties gossiping in the background.', 'Layla seeing the gossip spread.'),
      passages: [
        { text: 'An aunt has told half the community both families’ figures. Messages arrive: “Is it true they’re haggling over you?”' },
        { text: 'The figure the fathers agreed is now public, and Layla learns it from her cousin.', when: { flag: 'fathers_decided' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Layla. How do you respond?',
        choices: [
          { id: 'united', label: 'Call Faris: “Let’s answer this together, once, and then say nothing.”', effects: { vars: { partnership: 2 } }, next: 'decide_together', beat: 'Layla asked Faris to face the gossip together.' },
          { id: 'cancel', label: '“Maybe this isn’t meant to be.”', effects: { vars: { partnership: -2 }, flags: ['doubt'] }, next: 'pause', beat: 'Layla wondered aloud whether the engagement should go ahead.' },
          { id: 'ignore', label: 'Mute every group and let the families handle it.', effects: { vars: { voice: -1 } }, next: 'decide_together', beat: 'Layla muted the groups and left it to the families.' },
        ],
      },
    },
    pause: {
      id: 'pause',
      title: 'A pause',
      image: slot('adv-mahr-pause', 'scene', 'A young man sitting alone on a park bench at dusk holding his phone, an unsent message on the screen, trees around him.', 'Faris alone on a park bench.'),
      passages: [{ text: 'Layla’s message sits on Faris’s screen: “Maybe this isn’t meant to be.”' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Faris. What do you do?',
        choices: [
          { id: 'come', label: 'Ask to meet with both mothers present and listen.', effects: { vars: { partnership: 2, family: 1 } }, next: 'decide_together', beat: 'Faris asked to meet, with both mothers present, just to listen.' },
          { id: 'istikhara', label: 'Suggest they both pray istikhara and talk in a week.', effects: { vars: { partnership: 1 }, flags: ['istikhara'] }, next: 'decide_together', beat: 'Faris suggested they both pray istikhara before deciding.' },
          { id: 'release', label: '“If that’s what you want, I understand.”', effects: { vars: { partnership: -1 } }, next: 'end:apart', beat: 'Faris accepted it without a fight.' },
        ],
      },
    },
    decide_together: {
      id: 'decide_together',
      title: 'The decision',
      image: slot('adv-mahr-decide', 'scene', 'An engaged couple sitting at a café table with both mothers, a small notebook open, everyone listening to the young woman speak.', 'Layla speaking while the families listen.'),
      passages: [
        { text: 'Whatever happens next, Faris and Layla agree it will be decided with them in the room.' },
        { text: 'Both prayed istikhara this week. They feel calmer than their families.', when: { flag: 'istikhara' } },
      ],
      decision: {
        mode: 'joint',
        prompt: 'Together: how is the mahr decided?',
        choices: [
          { id: 'layla', label: 'Layla names it; Faris says honestly what he can give now and later.', effects: { vars: { voice: 2, partnership: 1 }, flags: ['layla_named'] }, next: 'tell_fathers', beat: 'Layla named the mahr, and Faris was honest about now and later.' },
          { id: 'meaningful', label: 'A meaningful mahr, a set of things chosen together, not a number.', effects: { vars: { voice: 1, partnership: 1 }, flags: ['meaningful'] }, next: 'tell_fathers', beat: 'They chose a meaningful mahr together instead of a number.' },
          { id: 'split', label: 'Meet the fathers halfway to keep the peace.', effects: { vars: { family: 1 } }, next: 'tell_fathers', beat: 'They split the difference between the fathers.' },
        ],
      },
    },
    tell_fathers: {
      id: 'tell_fathers',
      title: 'Telling the fathers',
      image: slot('adv-mahr-tell', 'scene', 'A young man and woman standing respectfully before two seated older men in a living room, the young man speaking, everyone attentive.', 'Faris and Layla telling their fathers.'),
      passages: [{ text: 'They go to both fathers together.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Faris. How do you put it?',
        choices: [
          { id: 'respect', label: '“We’ve decided together, and we’d love your blessing.”', effects: { vars: { family: 2 } }, next: { routes: endingRoutes() }, beat: 'Faris told the fathers the couple had decided and asked for their blessing.' },
          { id: 'firm', label: '“This is our decision. Please respect it.”', effects: { vars: { family: -1, partnership: 1 } }, next: { routes: endingRoutes() }, beat: 'Faris told the fathers firmly it was the couple’s decision.' },
        ],
      },
    },
  },
  endings: {
    her_mahr: {
      id: 'her_mahr', title: 'Her mahr, her choice', mood: 'renewed',
      image: slot('adv-mahr-end-hers', 'outcome', 'A bride and groom at a simple nikah ceremony, the bride smiling as an imam writes in a register, families gathered warmly.', 'Faris and Layla at their nikah.'),
      whatHappened: 'At the nikah, the imam reads out a mahr Layla chose herself. Both fathers nod.',
      pattern: { name: 'The couple as decision-makers', explanation: 'Families were honoured but not handed the decision.' },
      couldHaveChanged: 'Nothing big, though asking Layla on the first night would have saved a week.',
      takeaway: 'The mahr is the bride’s right; the decision is the couple’s to make, with families blessing it.',
      epilogues: [{ text: 'The two fathers end the evening laughing together.', when: { var: 'family', gte: 2 } }],
      guide: [{ id: 'mh-e-hers', text: 'Big decisions about our marriage are made with us in the room.' }],
    },
    meaningful: {
      id: 'meaningful', title: 'A meaningful mahr', mood: 'tender',
      image: slot('adv-mahr-end-meaningful', 'outcome', 'A small wooden box opened on a table showing a Qur’an, a handwritten letter and a modest gold bracelet, two pairs of hands nearby.', 'A box holding a Qur’an, a letter and a bracelet.'),
      whatHappened: 'The mahr is a Qur’an, a letter, and a promise of Umrah together. Layla says it is the richest thing she owns.',
      pattern: { name: 'Meaning over amount', explanation: 'Talking about what the mahr meant dissolved the fight about how much.' },
      couldHaveChanged: 'Starting with meaning, not numbers.',
      takeaway: 'Ask what something means before arguing about what it costs.',
      guide: [{ id: 'mh-e-meaning', text: 'We talk about what things mean before what they cost.' }],
    },
    fathers_deal: {
      id: 'fathers_deal', title: 'Settled without her', mood: 'fragile',
      image: slot('adv-mahr-end-deal', 'outcome', 'Two older men shaking hands in a hallway while a young woman stands slightly apart, looking down at her hands.', 'The fathers shaking hands while Layla stands apart.'),
      whatHappened: 'The fathers shook hands on a figure. The wedding goes ahead. Layla never quite forgets that she found out from her cousin.',
      pattern: { name: 'Voice spoken over', explanation: 'A decision about the bride was made without the bride.' },
      couldHaveChanged: 'Faris telling his father: “Layla and I will settle this together.”',
      takeaway: 'Peace bought by excluding your spouse is borrowed against your marriage.',
      guide: [{ id: 'mh-e-voice', text: 'Neither of us lets family decide over the other’s head.' }],
    },
    compromise: {
      id: 'compromise', title: 'Halfway', mood: 'steady',
      image: slot('adv-mahr-end-halfway', 'outcome', 'An engagement gathering with two families seated together, polite smiles, a cake on the table, the couple in the middle exchanging a relieved look.', 'Both families at the engagement gathering.'),
      whatHappened: 'Nobody got what they wanted; everybody can live with it. The wedding is back on track.',
      pattern: { name: 'Peacekeeping', explanation: 'Splitting the difference protected the families more than it expressed the couple.' },
      couldHaveChanged: 'Asking what each figure meant before splitting it.',
      takeaway: 'Compromise is good, once you know what each side actually needs.',
      guide: [{ id: 'mh-e-need', text: 'Before we compromise, we ask what each of us actually needs.' }],
    },
    stronger: {
      id: 'stronger', title: 'Stronger for it', mood: 'tender',
      image: slot('adv-mahr-end-stronger', 'outcome', 'A young couple walking side by side through a market, carrying a small bag each, comfortable and smiling, chaperone sister a few steps behind.', 'Faris and Layla walking through a market together.'),
      whatHappened: 'The week was ugly. But Faris and Layla now know how they handle pressure: together.',
      pattern: { name: 'A first test passed', explanation: 'An early conflict with family became practice for marriage.' },
      couldHaveChanged: 'Less of the family drama, but not the way they faced it.',
      takeaway: 'How you face the first family pressure sets the pattern for the rest.',
      guide: [{ id: 'mh-e-face', text: 'We face family pressure side by side, never against each other.' }],
    },
    bruised: {
      id: 'bruised', title: 'A bruised beginning', mood: 'strained',
      image: slot('adv-mahr-end-bruised', 'outcome', 'Two mothers sitting at opposite ends of a long table at a small engagement dinner, not speaking, the couple between them looking tense.', 'Two mothers not speaking at the engagement dinner.'),
      whatHappened: 'The engagement survives. The two families barely speak at the wedding.',
      pattern: { name: 'Winning against family', explanation: 'The couple asserted themselves, but bluntly, and the families felt dismissed.' },
      couldHaveChanged: 'The same decision, delivered with a request for blessing.',
      takeaway: 'Firm and respectful are not opposites.',
      guide: [{ id: 'mh-e-respect', text: 'We can disagree with our parents and still honour them.' }],
    },
    apart: {
      id: 'apart', title: 'Not meant to be', mood: 'bittersweet',
      image: slot('adv-mahr-end-apart', 'outcome', 'A young woman returning a small ring box to her mother in a quiet room, both sad but calm.', 'Layla returning the ring box.'),
      whatHappened: 'The engagement ends quietly. Both later say it was the right decision, made for the wrong reasons.',
      pattern: { name: 'Giving up under pressure', explanation: 'Exhaustion with the families ended something the couple never really discussed.' },
      couldHaveChanged: 'One honest conversation between the two of them, before deciding.',
      takeaway: 'Do not let a family conflict make a decision that belongs to the two of you.',
      guide: [{ id: 'mh-e-us', text: 'We talk directly before making any big decision about us.' }],
    },
    numbers: {
      id: 'numbers', title: 'Just a number', mood: 'steady',
      image: slot('adv-mahr-end-number', 'outcome', 'A young man signing a document at a desk with an imam, the bride beside him calmly, a plain room, ordinary and quiet.', 'Faris signing the nikah document.'),
      whatHappened: 'A figure is agreed and the nikah goes ahead. Neither of them is sure what it meant.',
      pattern: { name: 'Process without meaning', explanation: 'They got through it without ever talking about why it mattered.' },
      couldHaveChanged: 'Talking about what the mahr meant to each of them.',
      takeaway: 'Rituals you do not discuss can feel empty, even when they go smoothly.',
      epilogues: [{ text: 'Layla still wonders whether Faris thinks it was a formality.', when: { var: 'voice', lte: 0 } }],
      guide: [{ id: 'mh-e-why', text: 'We talk about why our traditions matter to each of us.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ flag: 'fathers_decided' }, { var: 'voice', lte: 0 }] }, to: 'end:fathers_deal' },
    { when: { all: [{ var: 'family', lte: -2 }, { var: 'partnership', gte: 1 }] }, to: 'end:bruised' },
    { when: { all: [{ flag: 'layla_named' }, { var: 'voice', gte: 3 }] }, to: 'end:her_mahr' },
    { when: { flag: 'meaningful' }, to: 'end:meaningful' },
    { when: { var: 'partnership', gte: 4 }, to: 'end:stronger' },
    { when: { all: [{ var: 'family', gte: 1 }, { var: 'voice', lte: 1 }] }, to: 'end:compromise' },
    { to: 'end:numbers' },
  ];
}
