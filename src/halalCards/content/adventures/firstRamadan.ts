import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The First Ramadan, in-laws, hosting, a comment at iftar, and the slow build
 * of things left unsaid. Hidden states: closeness, resentment, family.
 */
export const firstRamadan: Adventure = {
  id: 'adv-first-ramadan',
  kind: 'adventure',
  title: 'The First Ramadan',
  tagline: 'Four Fridays, one family iftar, and a comment about samosas.',
  description:
    'Hamza and Noor are four months married when Ramadan arrives, and Hamza’s mother has plans for it. Take turns as each of them. Small choices early on decide whether Eid feels like a homecoming or a truce.',
  minutes: 15,
  soloPreview: true,
  themes: ['Family and in-laws', 'Ramadan', 'Boundaries', 'Small things'],
  cover: slot('adv-ramadan-cover', 'cover', 'A newlywed couple’s small flat at maghrib, lanterns in the window, a long table being laid for many guests, the young wife pausing with a tray of dates.', 'A young couple preparing a big iftar in a small flat.'),
  roles: {
    A: { name: 'Hamza', gender: 'male', sketch: 'Loves his family, hates letting anyone down, especially his mother.' },
    B: { name: 'Noor', gender: 'female', sketch: 'Works full-time and hoped for a quiet Ramadan focused on worship.' },
  },
  variables: {
    closeness: { label: 'Closeness', initial: 0, readings: ['Hamza and Noor feel far apart.', 'They are getting by together.', 'They feel like a team.'] },
    resentment: { label: 'Unspoken resentment', initial: 0, concerning: true, readings: ['Very little is left unsaid.', 'A few things are still unspoken.', 'A lot has been swallowed.'] },
    family: { label: 'Family warmth', initial: 0, readings: ['There is strain with the family.', 'The families are cordial.', 'The families feel close.'] },
  },
  start: 'invite',
  scenes: {
    invite: {
      id: 'invite',
      title: 'The phone call',
      image: slot('adv-ramadan-invite', 'scene', 'A young man on the phone in a narrow hallway, smiling but uncertain, his wife visible in the kitchen behind him unpacking groceries.', 'Hamza on the phone in the hallway while Noor unpacks shopping.'),
      passages: [
        { text: 'Two days before Ramadan, Hamza’s mother calls. “Your first Ramadan as a married couple! The whole family will come to yours for iftar, every Friday. Your new flat, Noor’s cooking. It will be beautiful.”' },
        { text: 'Noor is in the kitchen. She works full-time, and last week she said she wanted this Ramadan to be quiet: more Qur’an, more tarawih, fewer gatherings.' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. What do you say to your mother?',
        choices: [
          {
            id: 'yes',
            label: '“Of course, Mum! We’d love that.”',
            effects: { vars: { family: 1, resentment: 1 }, flags: ['decided_alone'] },
            next: 'noor_finds_out',
            beat: 'Hamza agreed to four Friday iftars without asking Noor.',
            lesson: { id: 'r-l-alone', tag: 'Notice this', text: 'Saying yes for two people is a decision about your spouse’s time, made without them.' },
          },
          {
            id: 'check',
            label: '“That’s kind, Mum. Let me talk to Noor and call you back tonight.”',
            effects: { vars: { closeness: 1 } },
            next: 'talk_plan',
            beat: 'Hamza told his mother he would check with Noor first.',
          },
          {
            id: 'one',
            label: '“How about one Friday to start? Noor’s working all month.”',
            effects: { flags: ['offered_one'] },
            next: 'talk_plan',
            beat: 'Hamza offered his mother one Friday instead of four, before asking Noor.',
          },
        ],
      },
    },

    noor_finds_out: {
      id: 'noor_finds_out',
      title: 'The group chat',
      image: slot('adv-ramadan-groupchat', 'scene', 'A young woman sitting on the edge of a bed at night in a loose hijab, lit by her phone screen showing a busy family group chat full of hearts, her face quietly hurt.', 'Noor reading the family group chat at night.'),
      passages: [
        { text: 'That evening, the family WhatsApp group lights up. “Can’t wait for Fridays at Hamza and Noor’s!” Hearts. A sister-in-law asks what Noor will be making.' },
        { text: 'Noor scrolls back. Hamza has not said a word to her about it.' },
      ],
      lessons: [{ id: 'r-l-small', tag: 'Small thing', text: 'This could be a five-minute conversation tonight, or a story Noor tells herself for a month.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Noor. What do you do?',
        choices: [
          {
            id: 'raise',
            label: '“I found out from the group chat. Can we talk about how this was decided?”',
            effects: { vars: { closeness: 1 }, flags: ['raised_early'] },
            next: 'talk_plan',
            beat: 'Noor raised it with Hamza that same evening, calmly.',
            lesson: { id: 'r-l-raise', tag: 'Rule 1', text: 'Raised early and gently, a small hurt stays small.' },
          },
          {
            id: 'swallow',
            label: 'Say nothing. It is his family; she will manage.',
            effects: { vars: { resentment: 2 }, flags: ['swallowed'] },
            next: 'first_friday',
            beat: 'Noor said nothing and decided to cope.',
            lesson: { id: 'r-l-pebble', tag: 'Pattern forming', text: 'Notice how a small issue is becoming resentment. Coping quietly is not the same as being okay.' },
          },
          {
            id: 'group',
            label: 'Reply in the group: “Lovely of someone to tell me 🙂”',
            effects: { vars: { family: -2, resentment: 1 }, flags: ['group_message'] },
            next: 'group_fallout',
            beat: 'Noor replied in the family group with a pointed message.',
          },
        ],
      },
    },

    group_fallout: {
      id: 'group_fallout',
      title: 'The silence after',
      image: slot('adv-ramadan-fallout', 'scene', 'A young man standing in a narrow kitchen holding a phone to his ear, eyes closed, a framed photo of his mother on the wall behind him.', 'Hamza on an upsetting call from his mother.'),
      passages: [
        { text: 'The group goes silent. Then Hamza’s mother calls him, upset. “Does your wife not want us there? I was only trying to make her feel welcome.”' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. What do you say?',
        choices: [
          {
            id: 'own',
            label: '“Noor should have been asked. That was my mistake, Mum, not hers.”',
            effects: { vars: { closeness: 2, family: -1 }, flags: ['hamza_owned'] },
            next: 'talk_plan',
            beat: 'Hamza took responsibility with his mother instead of blaming Noor.',
            lesson: { id: 'r-l-own', tag: 'Repair', text: 'Owning your part protects your spouse and lowers everyone’s temperature.' },
          },
          {
            id: 'scold',
            label: 'Apologise to his mother, then tell Noor she embarrassed him.',
            effects: { vars: { closeness: -2, resentment: 2 } },
            next: 'first_friday',
            beat: 'Hamza apologised to his mother and told Noor she had embarrassed him.',
            lesson: { id: 'r-l-side', tag: 'Notice this', text: 'Noor’s hurt about being left out has now been replaced by a new one: being blamed for it.' },
          },
          {
            id: 'avoid',
            label: '“It’s nothing, Mum. It’ll blow over.”',
            effects: { vars: { resentment: 1 } },
            next: 'first_friday',
            beat: 'Hamza smoothed it over with his mother and talked to nobody.',
          },
        ],
      },
    },

    talk_plan: {
      id: 'talk_plan',
      title: 'Kitchen table',
      image: slot('adv-ramadan-plan', 'scene', 'A young married couple at a small kitchen table with two cups of tea and a paper Ramadan calendar between them, pens in hand, talking seriously but warmly.', 'Hamza and Noor planning Ramadan over tea.'),
      passages: [
        { text: 'Hamza and Noor sit down with two cups of tea and a calendar.' },
        { text: 'Hamza has already offered his mother one Friday. Noor notices she was not asked, but at least it is only one.', when: { flag: 'offered_one' } },
        { text: 'The group-chat message still hangs between them, but they are here, talking.', when: { flag: 'group_message' } },
      ],
      lessons: [{ id: 'r-l-joint', tag: 'Joint decision', text: 'You both have to pick the same answer. If you don’t, talk it through and choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: how many family iftars will you host this Ramadan?',
        choices: [
          { id: 'all', label: 'All four Fridays, it matters to his family.', effects: { vars: { family: 2, resentment: 1 }, flags: ['host_all'] }, next: 'first_friday', beat: 'They agreed to host all four Fridays.' },
          { id: 'two', label: 'Two Fridays, and alternate the others with Noor’s family.', effects: { vars: { family: 1, closeness: 1 }, flags: ['host_two'] }, next: 'first_friday', beat: 'They agreed on two Fridays, alternating with Noor’s family.' },
          { id: 'one', label: 'One big iftar, and visit them on other evenings.', effects: { vars: { closeness: 1 }, flags: ['host_one'] }, next: 'first_friday', beat: 'They agreed on one big iftar and visits on other nights.' },
        ],
      },
    },

    first_friday: {
      id: 'first_friday',
      title: 'The first Friday',
      turningPoint: true,
      image: slot('adv-ramadan-friday', 'turning_point', 'A crowded living room at iftar, plates of samosas and dates, an older woman gesturing at a plate while a young wife stands frozen holding a jug of water and her husband laughs nervously.', 'A crowded iftar where an older woman comments on the food.'),
      passages: [
        { text: 'Fourteen people in a flat built for four. Noor left work early and has been cooking since three.' },
        { text: 'She is exhausted. She has said nothing about the four Fridays, to anyone.', when: { flag: 'swallowed' } },
        { text: 'Since the group message, the aunties are polite to Noor, a little too polite.', when: { flag: 'group_message' } },
        { text: 'As the samosas go round, Hamza’s mother laughs: “In our family we make them fresh, not from the freezer. Never mind, Noor will learn!” A few people laugh along.' },
      ],
      lessons: [{ id: 'r-l-private', tag: 'Private choice', text: 'You each decide what your character does, at the same moment, without knowing what the other will do.' }],
      decision: {
        mode: 'private',
        prompt: 'In that moment, what do you do?',
        choices: [],
        byRole: {
          A: [
            {
              id: 'laugh',
              label: 'Laugh along to keep the mood light.',
              effects: { vars: { resentment: 1 }, flags: ['hamza_laughed'] },
              next: 'after_iftar',
              beat: 'Hamza laughed along at the comment.',
              lesson: { id: 'r-l-dismiss', tag: 'Notice this', text: 'This response may make your partner feel dismissed, and alone in a room full of family.' },
            },
            {
              id: 'praise',
              label: '“Honestly, Noor’s samosas are the best I’ve had. Pass them here!”',
              effects: { vars: { closeness: 2 }, flags: ['hamza_defended'] },
              next: 'after_iftar',
              beat: 'Hamza warmly praised Noor’s food in front of everyone.',
            },
            {
              id: 'later',
              label: 'Say nothing now; plan to speak to his mother privately.',
              effects: { vars: { closeness: 1 }, flags: ['plans_mum_talk'] },
              next: 'after_iftar',
              beat: 'Hamza let the moment pass, planning to speak to his mother privately.',
            },
          ],
          B: [
            {
              id: 'smile',
              label: 'Smile and say nothing.',
              effects: { vars: { resentment: 1 } },
              next: 'after_iftar',
              beat: 'Noor smiled and swallowed the comment.',
            },
            {
              id: 'joke',
              label: '“Next year you’ll have to teach me, Khala!”',
              effects: { vars: { family: 1 } },
              next: 'after_iftar',
              beat: 'Noor answered with a light joke that invited her mother-in-law in.',
            },
            {
              id: 'leave',
              label: 'Excuse herself to the kitchen to cool down.',
              effects: { vars: { family: -1, resentment: 1 } },
              next: 'after_iftar',
              beat: 'Noor left the room to cool down.',
            },
          ],
        },
        combos: [
          { pair: ['praise', 'joke'], next: 'warm_kitchen', beat: 'Hamza praised Noor’s food and Noor joked back, the room laughed with her, not at her.', effects: { vars: { family: 1 } } },
          { pair: ['laugh', 'smile'], next: 'tarawih_quiet', beat: 'Hamza laughed along and Noor smiled through it. Nobody said anything.' },
          { pair: ['laugh', 'leave'], next: 'after_iftar', beat: 'Hamza laughed along; Noor left the room. He did not follow.', effects: { vars: { closeness: -1 } } },
        ],
        diverge: 'after_iftar',
      },
    },

    warm_kitchen: {
      id: 'warm_kitchen',
      title: 'The kitchen, after',
      image: slot('adv-ramadan-kitchen', 'scene', 'An older woman and a young woman laughing together at a kitchen sink full of dishes after iftar, sleeves rolled up, steam rising, warm light.', 'Noor and her mother-in-law laughing at the sink.'),
      passages: [
        { text: 'Later, Hamza’s mother finds Noor washing up. “You know, my mother-in-law said the same to me about my dal. I cried for a week.” They both laugh.' },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Noor. What now?',
        choices: [
          { id: 'cook', label: '“Come early next Friday and we’ll make them fresh together.”', effects: { vars: { family: 2, closeness: 1 }, flags: ['cooked_together'] }, next: 'eid_morning', beat: 'Noor invited her mother-in-law to cook with her.' },
          { id: 'thanks', label: 'Thank her warmly, and keep hosting her own way.', effects: { vars: { family: 1 } }, next: 'last_ten', beat: 'Noor thanked her mother-in-law and kept hosting her own way.' },
        ],
      },
    },

    tarawih_quiet: {
      id: 'tarawih_quiet',
      title: 'The silent drive',
      image: slot('adv-ramadan-drive', 'scene', 'A couple in a small car at night driving to the mosque, the wife looking out of the window, the husband gripping the wheel, streetlights streaking, a minaret in the distance.', 'A silent drive to tarawih at night.'),
      passages: [
        { text: 'They drive to tarawih in silence. Noor stares out of the window. Hamza can feel something is wrong but cannot name it.' },
      ],
      lessons: [{ id: 'r-l-both', tag: 'Pattern forming', text: 'When both people swallow the same moment, it does not disappear. It waits.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. What do you do?',
        choices: [
          { id: 'ask', label: '“You’ve gone quiet. Was it something tonight?”', effects: { vars: { closeness: 1 } }, next: 'after_iftar', beat: 'Hamza noticed Noor’s silence and asked about it.' },
          { id: 'radio', label: 'Put on Qur’an recitation and say nothing.', effects: { vars: { resentment: 1 } }, next: 'last_ten', beat: 'Hamza filled the silence with recitation instead of a question.' },
        ],
      },
    },

    after_iftar: {
      id: 'after_iftar',
      title: 'After everyone leaves',
      image: slot('adv-ramadan-midnight', 'scene', 'A small flat at midnight after guests have left, a sink full of dishes, leftover dates on a plate, a young wife leaning on the counter and her husband in the doorway.', 'Hamza and Noor in the kitchen after guests leave.'),
      passages: [
        { text: 'Midnight. The flat is quiet again, the sink full.' },
        { text: 'Noor keeps hearing the laughter, and Hamza’s laugh among it.', when: { flag: 'hamza_laughed' } },
        { text: 'Hamza’s words, “the best I’ve had”, are still making her smile.', when: { flag: 'hamza_defended' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Noor. What do you do?',
        choices: [
          { id: 'tell', label: '“Can I tell you how the samosa comment felt?”', effects: { vars: { closeness: 1 }, flags: ['told_feelings'] }, next: 'hamza_listens', beat: 'Noor told Hamza calmly how the comment felt.' },
          { id: 'fine', label: '“I’m fine. Just tired.” And go to sleep.', effects: { vars: { resentment: 1 } }, next: 'last_ten', beat: 'Noor said she was fine and went to sleep.' },
          {
            id: 'list',
            label: 'Let it all out: the WhatsApp, the four Fridays, the laughing.',
            when: { var: 'resentment', gte: 2 },
            effects: { vars: { resentment: -1 } },
            next: 'blowup',
            beat: 'Noor let out everything she had been holding in, all at once.',
            lesson: { id: 'r-l-flood', tag: 'Notice this', text: 'A month of small things just arrived as one big thing. Hamza will hear it as an attack.' },
          },
        ],
      },
    },

    hamza_listens: {
      id: 'hamza_listens',
      title: 'Hamza listens',
      image: slot('adv-ramadan-listen', 'scene', 'A couple sitting on a sofa at night, the wife talking with her hands, the husband leaning forward listening intently, a lantern glowing on the side table.', 'Hamza listening carefully to Noor.'),
      passages: [{ text: 'Noor explains: in front of everyone, after cooking for hours, it felt like being graded.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. What do you say first?',
        choices: [
          {
            id: 'mum',
            label: '“That’s just how Mum is. She doesn’t mean anything by it.”',
            effects: { vars: { resentment: 1, closeness: -1 } },
            next: 'last_ten',
            beat: 'Hamza explained his mother instead of hearing Noor.',
            lesson: { id: 'r-l-explain', tag: 'Rule 2', text: 'Explaining before acknowledging tells your spouse their feelings are the problem.' },
          },
          {
            id: 'hear',
            label: '“That sounds like it really hurt. What would help?”',
            effects: { vars: { closeness: 2 } },
            next: 'boundary_plan',
            beat: 'Hamza acknowledged Noor’s hurt and asked what would help.',
            lesson: { id: 'r-l-validate', tag: 'Rule 2', text: 'Validation does not necessarily mean agreement. Hamza can love his mother and still say Noor’s feelings make sense.' },
          },
          { id: 'promise', label: '“I’ll talk to Mum tomorrow. You shouldn’t have to deal with that.”', effects: { vars: { closeness: 1 }, flags: ['plans_mum_talk'] }, next: 'mum_conversation', beat: 'Hamza promised to speak to his mother himself.' },
        ],
      },
    },

    mum_conversation: {
      id: 'mum_conversation',
      title: 'A word with Mum',
      turningPoint: true,
      image: slot('adv-ramadan-mum', 'turning_point', 'A young man and his mother sitting at her kitchen table after suhoor, a teapot between them, early grey light, him leaning forward earnestly.', 'Hamza talking with his mother at her kitchen table.'),
      passages: [{ text: 'After suhoor, Hamza visits his mother. She pours tea. He has rehearsed this three times.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. How do you put it?',
        choices: [
          {
            id: 'blame',
            label: '“Noor was really upset about what you said.”',
            effects: { vars: { family: -1 }, flags: ['noor_named'] },
            next: 'eid_morning',
            beat: 'Hamza told his mother Noor was upset, making Noor the complainant.',
            lesson: { id: 'r-l-messenger', tag: 'Notice this', text: 'Carrying the complaint as hers puts Noor between him and his mother.' },
          },
          { id: 'self', label: '“I want Noor to feel at home with us, Mum. Comments like that make it hard, for me too.”', effects: { vars: { family: 1, closeness: 1 }, flags: ['hamza_boundary'] }, next: 'eid_morning', beat: 'Hamza set a boundary with his mother in his own voice.' },
          { id: 'weather', label: 'Lose his nerve and talk about the weather.', effects: { vars: { resentment: 1 }, flags: ['lost_nerve'] }, next: 'last_ten', beat: 'Hamza lost his nerve and never raised it.' },
        ],
      },
    },

    blowup: {
      id: 'blowup',
      title: 'Everything at once',
      image: slot('adv-ramadan-blowup', 'scene', 'A young wife standing in a kitchen speaking emotionally, a crumpled tea towel in her hand, her husband frozen in the doorway, stunned, half-lit.', 'Noor letting everything out as Hamza stands stunned.'),
      passages: [{ text: 'It pours out, the group chat, the Fridays, the laughing, the exhaustion. Hamza stands in the kitchen doorway, stunned. He did not know any of this.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamza. What do you do?',
        choices: [
          { id: 'defend', label: '“You agreed to all of this! Why didn’t you say anything?”', effects: { vars: { resentment: 2, closeness: -1 } }, next: 'cold_week', beat: 'Hamza defended himself against the flood.' },
          {
            id: 'withdraw',
            label: 'Go quiet and leave the room.',
            effects: { vars: { resentment: 1 }, flags: ['withdrew'] },
            next: 'cold_week',
            beat: 'Hamza went quiet and left the room.',
            lesson: { id: 'r-l-loop', tag: 'Rule 3', text: 'An anxious/avoidant loop is forming here: the more she pursues, the more he retreats.' },
          },
          { id: 'pause', label: '“I didn’t know any of this. We’re both exhausted, can we talk properly after suhoor?”', effects: { vars: { closeness: 1 } }, next: 'boundary_plan', beat: 'Hamza asked for a pause with a time to come back.' },
        ],
      },
    },

    cold_week: {
      id: 'cold_week',
      title: 'A cold week',
      image: slot('adv-ramadan-cold', 'scene', 'Two prayer mats laid out in the same room but far apart, a husband and wife praying with a cool blue distance between them, night light through the window.', 'Hamza and Noor praying apart in a cold silence.'),
      passages: [
        { text: 'The last ten nights begin. They are polite. They pray in the same masjid and drive home without speaking.' },
      ],
      lessons: [{ id: 'r-l-cold', tag: 'Private choice', text: 'Each of you decides privately what you would do now.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you do this week?',
        choices: [
          { id: 'reach', label: 'Reach out first.', effects: { vars: { closeness: 1 } }, next: 'boundary_plan', beat: 'One of them reached out first.' },
          { id: 'wait', label: 'Wait for them to come to you.', effects: { vars: { resentment: 1 } }, next: 'end:quiet_eid', beat: 'One of them waited to be reached.' },
          { id: 'dua', label: 'Make du’a for the two of you, every night.', next: 'laylatul_qadr', beat: 'One of them made du’a for the marriage every night.' },
        ],
        combos: [
          { pair: ['reach', 'reach'], next: 'boundary_plan', beat: 'Both of them reached out on the same night, and laughed about it.', effects: { vars: { closeness: 1 } } },
          { pair: ['wait', 'wait'], next: 'end:quiet_eid', beat: 'Both waited for the other. Nobody came.' },
          { pair: ['reach', 'wait'], next: 'one_sided', beat: 'One reached out; the other was still waiting to be reached.' },
          { pair: ['dua', 'dua'], next: 'laylatul_qadr', beat: 'Without knowing, both spent the nights making du’a for the marriage.' },
          { pair: ['dua', 'reach'], next: 'boundary_plan', beat: 'One made du’a; the other reached out. The du’a was answered quickly.' },
          { pair: ['dua', 'wait'], next: 'one_sided', beat: 'One prayed for the marriage; the other waited, arms folded.' },
        ],
      },
    },

    one_sided: {
      id: 'one_sided',
      title: 'An olive branch',
      image: slot('adv-ramadan-olive', 'scene', 'A single cup of tea being set down beside someone\'s hand on a table, the other hand hesitating, morning light, a small gesture of peace.', 'A cup of tea offered as a peace gesture.'),
      passages: [{ text: 'A cup of tea appears on the other’s side of the table. A small, awkward offering.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what happens with the olive branch?',
        choices: [
          { id: 'accept', label: 'Take it, and actually talk.', effects: { vars: { closeness: 1 } }, next: 'boundary_plan', beat: 'They accepted the olive branch and talked.' },
          { id: 'surface', label: 'Take it, but keep things light. No deep talk.', effects: { vars: { resentment: 1 } }, next: 'end:polite_truce', beat: 'They made peace on the surface and left the rest unsaid.' },
        ],
      },
    },

    laylatul_qadr: {
      id: 'laylatul_qadr',
      title: 'The twenty-seventh night',
      image: slot('adv-ramadan-qadr', 'scene', 'A husband and wife walking home side by side under a deep blue night sky after late prayers, a crescent moon, streetlights, a quiet suburban street.', 'Hamza and Noor walking home together late at night.'),
      passages: [{ text: 'On the twenty-seventh night they find themselves walking home together, past midnight, the street completely still.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what happens on the walk home?',
        choices: [
          { id: 'talk', label: 'One of you says, “I’ve missed you this week.”', effects: { vars: { closeness: 2, resentment: -1 } }, next: 'boundary_plan', beat: 'On the twenty-seventh night, they broke the silence.' },
          { id: 'hold', label: 'Walk in silence, but closer than before.', effects: { vars: { closeness: 1 } }, next: 'eid_morning', beat: 'They walked home in a gentler silence.' },
        ],
      },
    },

    boundary_plan: {
      id: 'boundary_plan',
      title: 'A plan for the two of you',
      image: slot('adv-ramadan-boundary', 'scene', 'A husband and wife sitting cross-legged on a rug facing each other, holding hands, a notebook between them, calm and resolved, lanterns behind them.', 'Hamza and Noor making a plan together.'),
      passages: [{ text: 'Finally, the real conversation. Not about who was right, about what happens next.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what will you do for the rest of Ramadan?',
        choices: [
          { id: 'handle', label: 'Keep hosting, and Hamza answers comments in the moment.', effects: { vars: { family: 1, closeness: 1 }, flags: ['plan_handle'] }, next: 'eid_morning', beat: 'They agreed Hamza would speak up in the moment.' },
          { id: 'worship', label: 'Fewer gatherings; more worship at home, together.', effects: { vars: { closeness: 2, family: -1 }, flags: ['plan_worship'] }, next: 'last_ten', beat: 'They chose fewer gatherings and more worship together.' },
          { id: 'cohost', label: 'Ask both mothers to co-host the last iftar.', effects: { vars: { family: 2 }, flags: ['plan_cohost'] }, next: 'eid_morning', beat: 'They invited both mothers to co-host the last iftar.' },
        ],
      },
    },

    last_ten: {
      id: 'last_ten',
      title: 'The last ten nights',
      image: slot('adv-ramadan-lastten', 'scene', 'A mosque interior on one of the last ten nights of Ramadan, rows of worshippers under soft chandeliers, a man\'s and a woman\'s shoes side by side at the entrance.', 'The mosque during the last ten nights.'),
      passages: [
        { text: 'The last ten nights arrive, the best nights of the year.' },
        { text: 'There is still something unsaid between them.', when: { var: 'resentment', gte: 2 } },
      ],
      decision: {
        mode: 'private',
        prompt: 'How do you spend the last ten nights?',
        choices: [
          { id: 'together', label: 'Praying together at home and at the masjid.', effects: { vars: { closeness: 2 }, flags: ['prayed_together'] }, next: 'eid_morning', beat: 'One of them wanted the last ten nights in worship together.' },
          { id: 'alone', label: 'Each in our own worship, it’s personal.', next: 'eid_morning', beat: 'One of them wanted to keep worship personal.' },
          { id: 'rest', label: 'Rest, this month has been too much.', effects: { vars: { closeness: -1 } }, next: 'eid_morning', beat: 'One of them needed rest more than anything.' },
        ],
        combos: [
          { pair: ['together', 'together'], next: 'eid_morning', beat: 'Both wanted the last ten nights together, and had them.', effects: { vars: { resentment: -1 } } },
          { pair: ['together', 'rest'], next: 'eid_morning', beat: 'One hoped for nights of worship together; the other was too exhausted.', effects: { vars: { resentment: 1 } } },
        ],
        diverge: 'eid_morning',
      },
    },

    eid_morning: {
      id: 'eid_morning',
      title: 'Eid morning',
      turningPoint: true,
      image: slot('adv-ramadan-eid', 'turning_point', 'Eid morning, a couple in new clothes at their front door, both phones lighting up with messages, sunlight and a tray of sweets.', 'Hamza and Noor dressed for Eid at their front door.'),
      passages: [
        { text: 'Eid morning. Both phones buzz at once. Hamza’s mother: “Lunch at ours, of course!” Noor’s mother: “We’ll see you both at noon, insha’Allah.”' },
        { text: 'After the co-hosted iftar, the two mothers have been texting each other. Maybe there is a way.', when: { flag: 'plan_cohost' } },
        { text: 'Hamza’s mother has been gentler since their talk.', when: { flag: 'hamza_boundary' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Noor. What do you suggest?',
        choices: [
          { id: 'split', label: '“Morning at your mum’s, afternoon at mine?”', effects: { vars: { family: 1 } }, next: { routes: endingRoutes() }, beat: 'Noor suggested splitting Eid day between both families.' },
          { id: 'together', label: '“What if we brought everyone together?”', when: { var: 'family', gte: 2 }, effects: { vars: { family: 2, closeness: 1 } }, next: { routes: endingRoutes() }, beat: 'Noor suggested bringing both families together for Eid.' },
          { id: 'his', label: 'Go along with Hamza’s family again.', effects: { vars: { resentment: 1 } }, next: { routes: endingRoutes() }, beat: 'Noor went along with Hamza’s family for Eid.' },
          { id: 'mine', label: '“This year, my family. You had all of Ramadan.”', effects: { vars: { family: -1 } }, next: { routes: endingRoutes() }, beat: 'Noor insisted on her own family for Eid.' },
        ],
      },
    },
  },
  endings: {
    one_table: {
      id: 'one_table',
      title: 'One table',
      mood: 'renewed',
      image: slot('adv-ramadan-end-table', 'outcome', 'Two extended families squeezed around one long Eid table in a garden, two mothers laughing together, the young couple at the centre.', 'Both families at one long Eid table.'),
      whatHappened: 'Eid ends with both families around one table, and Hamza’s mother asking Noor for her samosa recipe.',
      pattern: { name: 'Repair over avoidance', explanation: 'Each time something hurt, someone eventually named it, and the other heard it.' },
      couldHaveChanged: 'Very little, though deciding the Fridays together from the start would have spared them the hardest week.',
      takeaway: 'Families blend when the couple acts as a team first.',
      epilogues: [
        { text: 'Next Ramadan, Hamza calls Noor before he answers his mother.', when: { flag: 'decided_alone' } },
        { text: 'Cooking together becomes a Friday tradition.', when: { flag: 'cooked_together' } },
      ],
      guide: [
        { id: 'r-e-team', text: 'We decide together before we say yes to family plans.' },
        { id: 'r-e-speak', text: 'We speak up for each other in the moment, kindly.' },
      ],
    },
    our_ramadan: {
      id: 'our_ramadan',
      title: 'Their own Ramadan',
      mood: 'tender',
      image: slot('adv-ramadan-end-ours', 'outcome', 'A couple praying side by side on two prayer mats in a softly lit living room at night, lanterns glowing.', 'Hamza and Noor praying side by side at home.'),
      whatHappened: 'Hamza and Noor end the month with fewer gatherings than his family hoped for, and a closeness neither expected.',
      pattern: { name: 'Small things said early', explanation: 'Hurts were raised while they were still small, so they stayed small.' },
      couldHaveChanged: 'Including the family a little more might have kept everyone warmer without costing the two of them anything.',
      takeaway: 'A marriage needs its own rhythm, even inside a big family.',
      epilogues: [
        { text: 'Hamza’s mother is a little cool for a while.', when: { var: 'family', lte: 0 } },
        { text: 'They keep praying together long after Ramadan ends.', when: { flag: 'prayed_together' } },
      ],
      guide: [{ id: 'r-e-small', text: 'Bring up small problems early.' }],
    },
    cracks: {
      id: 'cracks',
      title: 'Cracks under the lanterns',
      mood: 'strained',
      image: slot('adv-ramadan-end-cracks', 'outcome', 'A beautifully laid Eid table with a husband and wife sitting at opposite ends, not looking at each other, decorations still up.', 'Hamza and Noor at opposite ends of an Eid table.'),
      whatHappened: 'Eid looks perfect in the photos. At home, Hamza and Noor barely speak.',
      pattern: { name: 'Resentment by accumulation', explanation: 'Nothing big happened. Many small things went unsaid until they became a wall.' },
      couldHaveChanged: 'Any one of the small moments, the group chat, the laugh, “I’m fine”, said out loud, kindly, at the time.',
      takeaway: 'Silence keeps the peace for a day and costs it for a month.',
      epilogues: [
        { text: 'Hamza still doesn’t fully understand what went wrong.', when: { notFlag: 'told_feelings' } },
        { text: 'The night it all came out could have been the start of the repair. It was not followed up.', when: { flag: 'withdrew' } },
      ],
      guide: [
        { id: 'r-e-pebble', text: 'Say the small thing within a day or two.' },
        { id: 'r-e-loop', text: 'Don’t disappear during conflict.' },
      ],
    },
    us_against_them: {
      id: 'us_against_them',
      title: 'Us against them',
      mood: 'bittersweet',
      image: slot('adv-ramadan-end-us', 'outcome', 'A young couple eating Eid breakfast alone together in their small flat, smiling at each other, an unanswered phone glowing on the counter.', 'Hamza and Noor alone at Eid breakfast, a phone ignored.'),
      whatHappened: 'Hamza and Noor are closer than ever, and his family feel shut out.',
      pattern: { name: 'Closeness through exclusion', explanation: 'They became a team partly by defining themselves against the family.' },
      couldHaveChanged: 'Bringing the family back in once the two of them felt secure, a call, an invitation, a shared iftar.',
      takeaway: 'Protecting the marriage doesn’t have to mean closing the door.',
      epilogues: [{ text: 'Hamza’s mother keeps calling. Hamza keeps meaning to call back.', when: { var: 'family', lte: -2 } }],
      guide: [{ id: 'r-e-door', text: 'Our marriage comes first, and we keep the door open to family.' }],
    },
    lonely_hostess: {
      id: 'lonely_hostess',
      title: 'Everyone happy but Noor',
      mood: 'fragile',
      image: slot('adv-ramadan-end-lonely', 'outcome', 'A young woman alone in a kitchen at night surrounded by stacks of washed dishes, laughter and light from the living room behind her.', 'Noor alone in the kitchen while the family laughs next door.'),
      whatHappened: 'Hamza’s family call it the best Ramadan in years. Noor is exhausted and quietly lonely.',
      pattern: { name: 'Keeping the peace at your spouse’s expense', explanation: 'Family harmony was bought with Noor’s silence, and Hamza didn’t notice the price.' },
      couldHaveChanged: 'Hamza asking, just once, “How are you finding all this?”, and Noor answering honestly.',
      takeaway: 'A happy family and a happy marriage are not the same thing. You need both.',
      epilogues: [{ text: 'Noor starts dreading next Ramadan in Sha’ban.', when: { var: 'resentment', gte: 3 } }],
      guide: [{ id: 'r-e-check', text: 'Check in with each other during busy family seasons.' }],
    },
    polite_truce: {
      id: 'polite_truce',
      title: 'A polite truce',
      mood: 'fragile',
      image: slot('adv-ramadan-end-truce', 'outcome', 'A husband and wife exchanging Eid gifts politely in a living room, smiling slightly, sitting a little too far apart on the sofa.', 'Hamza and Noor exchanging gifts politely.'),
      whatHappened: 'The tension eases. Nothing is resolved. They agree, without saying it, not to talk about Ramadan.',
      pattern: { name: 'Peace without repair', explanation: 'They stopped the conflict without understanding it, so it will return in a new form.' },
      couldHaveChanged: 'Using the olive branch to have the real conversation, not to avoid it.',
      takeaway: 'An argument ended is not the same as an argument resolved.',
      guide: [{ id: 'r-e-repair', text: 'When we make peace, we also talk about what happened.' }],
    },
    quiet_eid: {
      id: 'quiet_eid',
      title: 'A quiet Eid',
      mood: 'strained',
      image: slot('adv-ramadan-end-quiet', 'outcome', 'Eid morning, a husband and wife getting ready in separate rooms of a flat, a closed door between them.', 'Hamza and Noor getting ready for Eid in separate rooms.'),
      whatHappened: 'Both waited for the other to move first. Eid comes and goes with polite greetings and nothing more.',
      pattern: { name: 'Mutual withdrawal', explanation: 'When both people withdraw, nobody is left to start the repair.' },
      couldHaveChanged: 'Either one of them reaching out, it did not matter who.',
      takeaway: 'Waiting to be reached is a choice too.',
      guide: [{ id: 'r-e-first', text: 'Whoever notices the distance first reaches out first.' }],
    },
    steady_start: {
      id: 'steady_start',
      title: 'A first Ramadan, survived',
      mood: 'steady',
      image: slot('adv-ramadan-end-steady', 'outcome', 'A couple on a balcony at night after Eid, tired, sharing a plate of sweets, the city lights below.', 'Hamza and Noor sharing sweets on a balcony after Eid.'),
      whatHappened: 'Some evenings were hard and some were lovely. They end the month tired, a little wiser, and still on the same side.',
      pattern: { name: 'Learning by doing', explanation: 'They handled some moments well and others not, and noticed the difference.' },
      couldHaveChanged: 'Talking sooner about what each of them wanted from Ramadan, before the family plans began.',
      takeaway: 'Before a big season, ask each other: what do you hope this will feel like?',
      epilogues: [
        { text: 'Something small is still unsaid between them.', when: { var: 'resentment', gte: 2 } },
        { text: 'Hamza has started asking before he says yes.', when: { flag: 'plans_mum_talk' } },
      ],
      guide: [{ id: 'r-e-hope', text: 'Before Ramadan and Eid, we talk about what we each hope for.' }],
    },
    kitchen_peace: {
      id: 'kitchen_peace',
      title: 'Peace in the kitchen',
      mood: 'tender',
      image: slot('adv-ramadan-end-kitchen', 'outcome', 'An older woman and a young woman laughing while folding samosas together at a kitchen counter, flour everywhere.', 'Noor and her mother-in-law folding samosas together.'),
      whatHappened: 'The samosa comment becomes the family’s favourite joke, told by Noor.',
      pattern: { name: 'Turning toward', explanation: 'Instead of withdrawing from the hurt, Noor invited her mother-in-law closer.' },
      couldHaveChanged: 'Hamza and Noor could have talked more as a couple; much of the repair happened between Noor and his mother.',
      takeaway: 'Sometimes the bravest response to a sharp comment is an invitation.',
      guide: [{ id: 'r-e-invite', text: 'We turn toward family when it’s safe to, not away.' }],
    },
  },
};

/** Shared by every Eid choice so the ending reflects the whole month. */
function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ var: 'closeness', gte: 4 }, { var: 'family', gte: 3 }] }, to: 'end:one_table' },
    { when: { all: [{ flag: 'cooked_together' }, { var: 'resentment', lte: 2 }] }, to: 'end:kitchen_peace' },
    { when: { var: 'resentment', gte: 4 }, to: 'end:cracks' },
    { when: { all: [{ var: 'closeness', gte: 3 }, { var: 'family', lte: -1 }] }, to: 'end:us_against_them' },
    { when: { all: [{ var: 'closeness', gte: 3 }, { var: 'resentment', lte: 1 }] }, to: 'end:our_ramadan' },
    { when: { all: [{ var: 'family', gte: 2 }, { var: 'closeness', lte: 1 }] }, to: 'end:lonely_hostess' },
    { when: { var: 'resentment', gte: 3 }, to: 'end:polite_truce' },
    { to: 'end:steady_start' },
  ];
}
