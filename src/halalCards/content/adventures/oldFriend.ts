import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Old Friend, an innocent friendship that does not feel innocent from
 * the outside, and what spouses owe each other about boundaries. Hidden
 * states: trust, transparency, security.
 */
export const oldFriend: Adventure = {
  id: 'adv-old-friend',
  kind: 'adventure',
  title: 'The Old Friend',
  tagline: 'An old colleague asks for career advice. It is innocent. Isn’t it?',
  description:
    'Sami’s former colleague from university starts messaging him for career advice. Nothing improper is said. Leila is not sure it feels innocent, and is not sure she is allowed to say so. Play both of them through late messages, a work dinner, and the boundaries a marriage needs.',
  minutes: 13,
  themes: ['Jealousy', 'Boundaries', 'Trust', 'Opposite-sex friendships'],
  cover: slot('concept-friend-cover', 'cover', 'A phone lighting up on a dark bedside table with a notification, a man asleep and a woman awake beside him looking at it.', 'A phone notification glowing at night beside a sleeping husband.'),
  roles: {
    A: { name: 'Sami', gender: 'male', sketch: 'Helpful to a fault; does not think of himself as someone anyone needs to worry about.' },
    B: { name: 'Leila', gender: 'female', sketch: 'Trusting, but has been hurt before by things left unsaid.' },
  },
  variables: {
    trust: { label: 'Trust', initial: 0, readings: ['Trust has cracked.', 'Trust is holding.', 'Trust has deepened.'] },
    transparency: { label: 'Openness', initial: 0, readings: ['Things are being hidden.', 'Some things are shared.', 'Nothing needs hiding.'] },
    security: { label: 'Leila’s security', initial: 0, readings: ['Leila feels anxious and alone.', 'Leila feels mostly settled.', 'Leila feels completely secure.'] },
  },
  start: 'notification',
  scenes: {
    notification: {
      id: 'notification',
      title: '11:40 p.m.',
      image: slot('adv-friend-notification', 'scene', 'A dark bedroom, a phone screen lighting up on a bedside table, a woman lying awake looking at it, her husband asleep facing away.', 'Leila noticing a late-night message on Sami’s phone.'),
      passages: [{ text: 'Sami’s phone lights up at 11:40 p.m.: “Thank you so much again, you’re a lifesaver 😊”, from Hana, his old university colleague.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Leila. What do you do?',
        choices: [
          { id: 'ask', label: 'In the morning, ask simply: “Who’s Hana?”', effects: { vars: { transparency: 1 } }, next: 'sami_answers', beat: 'Leila asked Sami simply who Hana was.' },
          { id: 'check', label: 'Read the messages while he sleeps.', effects: { vars: { trust: -1 }, flags: ['checked'] }, next: 'sami_answers', beat: 'Leila read Sami’s messages while he slept.', lesson: { id: 'of-l-check', tag: 'Notice this', text: 'Checking may calm the worry for a night, and adds a secret of your own.' } },
          { id: 'ignore', label: 'Tell herself it’s nothing.', effects: { vars: { security: -1 }, flags: ['ignored'] }, next: 'sami_answers', beat: 'Leila told herself it was nothing.' },
        ],
      },
    },
    sami_answers: {
      id: 'sami_answers',
      title: '“Oh, Hana?”',
      image: slot('adv-friend-answers', 'scene', 'A man at a breakfast table holding his phone up casually as if explaining, his wife across from him with a cup, watching his face carefully.', 'Sami explaining over breakfast.'),
      passages: [
        { text: 'Over breakfast, the subject comes up.' },
        { text: 'Leila already knows what the messages say: career advice, and a lot of gratitude.', when: { flag: 'checked' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Sami. How do you respond?',
        choices: [
          { id: 'open', label: 'Hand her the phone: “Read anything you like. She’s job hunting.”', effects: { vars: { transparency: 2, security: 1 } }, next: 'dinner_invite', beat: 'Sami offered Leila his phone and explained.' },
          { id: 'dismiss', label: '“It’s nothing, just a colleague. Don’t be silly.”', effects: { vars: { security: -1 } }, next: 'dinner_invite', beat: 'Sami told Leila not to be silly.', lesson: { id: 'of-l-dismiss', tag: 'Rule 2', text: 'This response may make your partner feel dismissed, the worry is real even if the threat isn’t.' } },
          { id: 'defensive', label: '“Are you going through my phone now?”', effects: { vars: { trust: -1 } }, next: 'dinner_invite', beat: 'Sami got defensive about his phone.' },
        ],
      },
    },
    dinner_invite: {
      id: 'dinner_invite',
      title: 'The work dinner',
      image: slot('adv-friend-dinner', 'scene', 'A man reading an email invitation on a laptop at a home desk, his wife reading over his shoulder, a restaurant name implied by a simple illustrated menu card icon.', 'Sami and Leila reading a dinner invitation.'),
      passages: [{ text: 'Hana invites Sami to a networking dinner with her new team, as a thank-you. Spouses aren’t mentioned.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Sami. What do you do?',
        choices: [
          { id: 'with_leila', label: 'Say yes, if Leila comes too.', effects: { vars: { security: 2, transparency: 1 }, flags: ['brought_leila'] }, next: 'feelings', beat: 'Sami accepted the dinner only if Leila came too.' },
          { id: 'decline', label: 'Decline politely.', effects: { vars: { security: 1 } }, next: 'feelings', beat: 'Sami declined the dinner.' },
          { id: 'go_alone', label: 'Go alone, it’s professional.', effects: { vars: { security: -1 }, flags: ['went_alone'] }, next: 'feelings', beat: 'Sami went to the dinner alone.' },
        ],
      },
    },
    feelings: {
      id: 'feelings',
      title: 'What Leila feels',
      turningPoint: true,
      image: slot('adv-friend-feelings', 'turning_point', 'A woman sitting on the edge of a bed holding a cushion, speaking vulnerably, her husband kneeling in front of her listening.', 'Leila speaking honestly as Sami listens.'),
      passages: [
        { text: 'That night, Leila decides to say what she actually feels.' },
        { text: 'He came home from the dinner at eleven, cheerful. She has been quiet all evening.', when: { flag: 'went_alone' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you each say?',
        choices: [],
        byRole: {
          A: [
            { id: 'listen', label: 'Listen to the end, then: “That makes sense. What would help?”', effects: { vars: { trust: 2, security: 1 } }, next: 'boundaries', beat: 'Sami listened to the end and asked what would help.' },
            { id: 'explain', label: 'Explain at length why there’s nothing to worry about.', effects: { vars: { security: -1 } }, next: 'boundaries', beat: 'Sami explained at length why there was nothing to worry about.' },
            { id: 'hurt', label: '“So you don’t trust me.”', effects: { vars: { trust: -1 } }, next: 'boundaries', beat: 'Sami said she did not trust him.' },
          ],
          B: [
            { id: 'honest', label: '“I trust you. I just don’t like feeling like an outsider to it.”', effects: { vars: { trust: 1 }, flags: ['said_feeling'] }, next: 'boundaries', beat: 'Leila said she trusted him but felt like an outsider.' },
            { id: 'accuse', label: '“Why does she need you at midnight?”', effects: { vars: { trust: -1 } }, next: 'boundaries', beat: 'Leila asked why Hana needed him at midnight.' },
            { id: 'shrug', label: '“It’s fine. Forget it.”', effects: { vars: { security: -1 }, flags: ['buried'] }, next: 'boundaries', beat: 'Leila said it was fine.' },
          ],
        },
        combos: [
          { pair: ['listen', 'honest'], next: 'boundaries', beat: 'She said the feeling; he heard it without defending himself.', effects: { vars: { trust: 2, security: 1 } } },
          { pair: ['hurt', 'accuse'], next: 'boundaries', beat: 'She accused; he took offence. It became about loyalty.', effects: { vars: { trust: -2 } } },
          { pair: ['explain', 'shrug'], next: 'boundaries', beat: 'He explained; she gave up. Nothing changed.', effects: { vars: { security: -1 } } },
        ],
        diverge: 'boundaries',
      },
    },
    boundaries: {
      id: 'boundaries',
      title: 'The boundary',
      image: slot('adv-friend-boundary', 'scene', 'A couple sitting close on a sofa with two phones laid face up on the coffee table in front of them, calm, talking.', 'Sami and Leila agreeing boundaries, phones on the table.'),
      passages: [{ text: 'They talk about what feels right for opposite-sex friendships in their marriage.' }],
      lessons: [{ id: 'of-l-joint', tag: 'Joint decision', text: 'Choose together. A mismatch means talk, then choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what will you agree?',
        choices: [
          { id: 'groups', label: 'Advice in group chats or by email only, nothing late, nothing one-to-one.', effects: { vars: { security: 2, transparency: 1 }, flags: ['agreed'] }, next: 'hana_again', beat: 'They agreed advice would only happen in groups or by email, never late.' },
          { id: 'open_phones', label: 'Nothing hidden: either can see the other’s messages any time.', effects: { vars: { transparency: 2 }, flags: ['open_phones'] }, next: 'hana_again', beat: 'They agreed either could see the other’s messages.' },
          { id: 'end', label: 'Sami ends the friendship kindly.', effects: { vars: { security: 2, trust: 1 }, flags: ['ended'] }, next: 'hana_again', beat: 'They agreed Sami would kindly end the friendship.' },
        ],
      },
    },
    hana_again: {
      id: 'hana_again',
      title: 'Another message',
      turningPoint: true,
      image: slot('adv-friend-again', 'turning_point', 'A man in an office looking at his phone showing a new message, a small hesitation in his face, sunlight through blinds.', 'Sami hesitating over a new message at work.'),
      passages: [{ text: 'A month later: “Sami, quick favour, can I call you tonight? Big interview tomorrow!”' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Sami. What do you do?',
        choices: [
          { id: 'keep', label: 'Reply by email with tips, and mention it to Leila that evening.', effects: { vars: { trust: 2, transparency: 1 } }, next: 'leila_hears', beat: 'Sami replied by email and told Leila about it.' },
          { id: 'call', label: 'Call, it’s a one-off, and not mention it.', effects: { vars: { trust: -2 }, flags: ['hid_call'] }, next: 'leila_hears', beat: 'Sami took the call and did not mention it.' },
        ],
      },
    },
    leila_hears: {
      id: 'leila_hears',
      title: 'A year on',
      image: slot('adv-friend-year', 'scene', 'A couple walking along a river path in autumn, the wife holding the husband’s arm, both talking easily.', 'Sami and Leila walking by the river.'),
      passages: [
        { text: 'A year on. Leila is asked by a friend whether she ever worries about Sami.' },
        { text: 'She found the call in his history weeks later.', when: { flag: 'hid_call' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Leila. What do you say?',
        choices: [
          { id: 'no', label: '“Never. We talk about everything now.”', effects: { vars: { security: 1 } }, next: { routes: endingRoutes() }, beat: 'Leila said she never worried now.' },
          { id: 'sometimes', label: '“Sometimes. I wish I didn’t.”', effects: { vars: { security: -1 } }, next: { routes: endingRoutes() }, beat: 'Leila admitted she sometimes still worried.' },
        ],
      },
    },
  },
  endings: {
    nothing_hidden: {
      id: 'nothing_hidden', title: 'Nothing to hide', mood: 'renewed',
      image: slot('adv-friend-end-nothing', 'outcome', 'A husband and wife cooking together in a kitchen, one phone lying face up on the counter beside them, relaxed and laughing.', 'Sami and Leila cooking together, a phone face up beside them.'),
      whatHappened: 'Leila hasn’t thought about Hana in months. Sami still helps people, in daylight, by email.',
      pattern: { name: 'Proactive transparency', explanation: 'He offered openness before it was asked for, so trust grew instead of shrinking.' },
      couldHaveChanged: 'Little; agreeing the boundary before the first late message.',
      takeaway: 'Transparency offered is worth more than transparency demanded.',
      epilogues: [{ text: 'Hana gets the job, and sends them both a thank-you card.', when: { flag: 'agreed' } }],
      guide: [{ id: 'of-e-open', text: 'We keep opposite-sex contact in the open, in daylight, and tell each other about it.' }],
    },
    heard: {
      id: 'heard', title: 'Heard', mood: 'tender',
      image: slot('adv-friend-end-heard', 'outcome', 'A wife resting her forehead against her husband’s, both eyes closed, a gentle reconciled moment in a dim living room.', 'Sami and Leila forehead to forehead.'),
      whatHappened: 'The night he listened without defending himself is the night Leila stopped worrying.',
      pattern: { name: 'Validation without agreement', explanation: 'He didn’t agree there was a threat, he agreed her feeling made sense.' },
      couldHaveChanged: 'Not much.',
      takeaway: 'Validation does not mean agreement. It means “I understand.”',
      guide: [{ id: 'of-e-heard', text: 'When one of us feels insecure, the other listens before explaining.' }],
    },
    ended: {
      id: 'ended', title: 'A kind ending', mood: 'steady',
      image: slot('adv-friend-end-ended', 'outcome', 'A man typing a kind message on his phone at a desk, his wife beside him with a hand on his shoulder, calm.', 'Sami typing a kind goodbye message.'),
      whatHappened: 'Sami tells Hana kindly that he’ll step back. It costs him nothing he values more than Leila’s peace.',
      pattern: { name: 'Choosing the marriage', explanation: 'An innocent friendship was ended because the marriage mattered more.' },
      couldHaveChanged: 'Clearer boundaries could have kept the friendship.',
      takeaway: 'Innocent and wise are not always the same thing.',
      guide: [{ id: 'of-e-wise', text: 'We choose what protects our marriage, even when nothing is wrong.' }],
    },
    hidden_call: {
      id: 'hidden_call', title: 'The call she found', mood: 'strained',
      image: slot('adv-friend-end-hidden', 'outcome', 'A woman holding her husband’s phone showing a call log, looking at him across a room, hurt rather than angry.', 'Leila holding Sami’s phone, hurt.'),
      whatHappened: 'The call was innocent. Hiding it was not. It takes months to rebuild what one omission broke.',
      pattern: { name: 'Secrecy over substance', explanation: 'The hiding, not the call, broke the trust.' },
      couldHaveChanged: 'Mentioning it that evening, or replying by email.',
      takeaway: 'The cover-up is always worse than the thing.',
      guide: [{ id: 'of-e-tell', text: 'If we would hesitate to mention it, we mention it.' }],
    },
    surveillance: {
      id: 'surveillance', title: 'Open phones, closed hearts', mood: 'fragile',
      image: slot('adv-friend-end-phones', 'outcome', 'Two phones side by side on a table, both screens lit, a couple sitting at the table not looking at each other.', 'Two phones on the table, the couple not looking at each other.'),
      whatHappened: 'Each can read the other’s phone. Neither feels any closer.',
      pattern: { name: 'Access instead of trust', explanation: 'Checking replaced the conversations that would have built real security.' },
      couldHaveChanged: 'Leila saying the feeling underneath; Sami listening.',
      takeaway: 'Access is not intimacy.',
      guide: [{ id: 'of-e-access', text: 'We build trust by talking, not by checking.' }],
    },
    loyalty_fight: {
      id: 'loyalty_fight', title: 'A fight about loyalty', mood: 'strained',
      image: slot('adv-friend-end-loyalty', 'outcome', 'A couple standing on opposite sides of a kitchen island, arms crossed, a phone face down between them.', 'Sami and Leila on opposite sides of the kitchen island.'),
      whatHappened: 'It stopped being about Hana weeks ago. Now it is about whether either of them is on the other’s side.',
      pattern: { name: 'Accusation and defence', explanation: 'An accusation met with offence turned a worry into a war.' },
      couldHaveChanged: 'Leila naming the feeling instead of the suspicion; Sami hearing it.',
      takeaway: 'Name the feeling, not the suspicion.',
      guide: [{ id: 'of-e-feeling', text: 'We say what we feel, not what we suspect.' }],
    },
    quiet_worry: {
      id: 'quiet_worry', title: 'A quiet worry', mood: 'bittersweet',
      image: slot('adv-friend-end-worry', 'outcome', 'A woman glancing at her husband’s phone as it buzzes on a sofa while he reads, a small shadow of doubt on her face.', 'Leila glancing at Sami’s buzzing phone.'),
      whatHappened: 'Nothing happened. Leila still feels a small jolt whenever his phone buzzes late.',
      pattern: { name: 'Unspoken insecurity', explanation: 'A feeling buried rather than heard stays alive.' },
      couldHaveChanged: 'Leila saying it, and Sami listening without explaining.',
      takeaway: 'A buried worry does not go away. It waits.',
      guide: [{ id: 'of-e-unburied', text: 'We say our worries out loud, even small ones.' }],
    },
    steady: {
      id: 'steady', title: 'Steady enough', mood: 'steady',
      image: slot('adv-friend-end-steady', 'outcome', 'A couple reading on a sofa in the evening, feet touching, a lamp between them, peaceful and ordinary.', 'Sami and Leila reading together on the sofa.'),
      whatHappened: 'They found a way through, a little clumsily. Both know more about what the other needs.',
      pattern: { name: 'Learning each other’s boundaries', explanation: 'They worked out what felt right as they went.' },
      couldHaveChanged: 'Agreeing boundaries before anyone needed them.',
      takeaway: 'Agree your boundaries before you are tested.',
      epilogues: [{ text: 'They still disagree a little about what counts as “too late”.', when: { var: 'security', lte: 1 } }],
      guide: [{ id: 'of-e-before', text: 'We agree boundaries before we are tested.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'hid_call' }, to: 'end:hidden_call' },
    { when: { var: 'trust', lte: -3 }, to: 'end:loyalty_fight' },
    { when: { all: [{ flag: 'open_phones' }, { var: 'security', lte: 1 }] }, to: 'end:surveillance' },
    { when: { flag: 'ended' }, to: 'end:ended' },
    { when: { all: [{ var: 'transparency', gte: 3 }, { var: 'security', gte: 3 }] }, to: 'end:nothing_hidden' },
    { when: { all: [{ flag: 'said_feeling' }, { var: 'trust', gte: 3 }] }, to: 'end:heard' },
    { when: { flag: 'buried' }, to: 'end:quiet_worry' },
    { to: 'end:steady' },
  ];
}
