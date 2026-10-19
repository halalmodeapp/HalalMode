import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Public Couple, Private Couple, one loves sharing their life online, one
 * wants it kept private, and a post goes further than either expected.
 * Hidden states: trust, privacy, closeness.
 */
export const publicPrivate: Adventure = {
  id: 'adv-public-private',
  kind: 'adventure',
  title: 'Public Couple, Private Couple',
  tagline: 'She posts their life. He wants it kept between them. Then a post goes viral.',
  description:
    'Rania has a growing following for her calm, faith-centred lifestyle posts, and their marriage is part of it. Tariq is a private man who never agreed to be content. Play both of them through a sponsorship offer, a viral post about their first argument, and the comment section that follows.',
  minutes: 13,
  themes: ['Social media', 'Boundaries', 'Privacy'],
  cover: slot('concept-insta-cover', 'cover', 'A couple at a café, the woman holding up a phone to film their coffees, the man covering his face with a menu, laughing.', 'A wife filming coffees while her husband hides behind a menu.'),
  roles: {
    A: { name: 'Tariq', gender: 'male', sketch: 'An accountant; quiet, loyal, allergic to attention.' },
    B: { name: 'Rania', gender: 'female', sketch: 'Shares modest-lifestyle content to 40,000 followers; it pays.' },
  },
  variables: {
    trust: { label: 'Trust', initial: 0, readings: ['Trust has been bruised.', 'Trust is holding.', 'Trust has deepened.'] },
    privacy: { label: 'Privacy respected', initial: 0, readings: ['Their private life feels exposed.', 'Some lines are in place.', 'Their private life feels safe.'] },
    closeness: { label: 'Closeness', initial: 0, readings: ['They feel like a brand and its subject.', 'They are close enough.', 'They feel close and protected.'] },
  },
  start: 'sponsor',
  scenes: {
    sponsor: {
      id: 'sponsor',
      title: 'The offer',
      image: slot('adv-insta-sponsor', 'scene', 'A young woman in a hijab on a sofa holding up her phone excitedly to show an email, her husband beside her with a laptop, eyebrows raised cautiously.', 'Rania showing Tariq a sponsorship email.'),
      passages: [{ text: 'A modest-fashion brand wants Rania for a paid campaign: “couple content”, six posts, both of them on camera.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Rania. What do you do?',
        choices: [
          { id: 'ask', label: 'Show Tariq and ask how he feels before replying.', effects: { vars: { trust: 1 } }, next: 'reaction', beat: 'Rania asked Tariq how he felt before replying to the brand.' },
          { id: 'accept', label: 'Say yes, he’ll come round, and the money is good.', effects: { vars: { trust: -1, privacy: -1 }, flags: ['accepted_alone'] }, next: 'reaction', beat: 'Rania accepted the campaign before asking Tariq.' },
          { id: 'solo', label: 'Counter-offer: she’ll do it alone, no husband.', effects: { vars: { privacy: 1 } }, next: 'reaction', beat: 'Rania offered to do the campaign without Tariq.' },
        ],
      },
    },
    reaction: {
      id: 'reaction',
      title: 'Tariq hears',
      image: slot('adv-insta-reaction', 'scene', 'A man sitting at a kitchen table with a calm but serious face, hands folded, his wife standing by the counter waiting for his answer.', 'Tariq considering his answer at the kitchen table.'),
      passages: [
        { text: 'Tariq takes a long breath.' },
        { text: 'She has already said yes.', when: { flag: 'accepted_alone' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Tariq. What do you say?',
        choices: [
          { id: 'lines', label: '“I’ll support your work. But I want us to agree what’s off-limits.”', effects: { vars: { trust: 1, closeness: 1 }, flags: ['wants_lines'] }, next: 'argument', beat: 'Tariq offered support on condition they agreed limits together.' },
          { id: 'refuse', label: '“I never agreed to be part of this. No.”', effects: { vars: { closeness: -1 } }, next: 'argument', beat: 'Tariq refused to be part of it at all.' },
          { id: 'go_along', label: '“Fine.” He doesn’t want to be the reason she loses money.', effects: { vars: { privacy: -1 }, flags: ['swallowed'] }, next: 'argument', beat: 'Tariq went along with it to avoid an argument.' },
        ],
      },
    },
    argument: {
      id: 'argument',
      title: 'The first real argument',
      image: slot('adv-insta-argument', 'scene', 'A couple in a living room mid-argument, both standing, gesturing, a ring light and tripod set up in the corner of the room.', 'Tariq and Rania arguing beside her ring light.'),
      passages: [
        { text: 'A week later, a real argument, about chores, about the campaign, about everything. Rania, upset, writes a vague, emotional post: “When marriage gets hard, keep showing up.” It is clearly about them.' },
      ],
      lessons: [{ id: 'pp-l-post', tag: 'Notice this', text: 'Posting about a conflict, even vaguely, invites strangers into it.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Rania. Do you post it?',
        choices: [
          { id: 'post', label: 'Post it. It’s honest, and it might help someone.', effects: { vars: { privacy: -2, trust: -1 }, flags: ['posted_fight'] }, next: 'viral', beat: 'Rania posted about their argument.' },
          { id: 'draft', label: 'Keep it in drafts and talk to Tariq first.', effects: { vars: { trust: 1, privacy: 1 } }, next: 'boundaries', beat: 'Rania kept the post in drafts and talked to Tariq first.' },
        ],
      },
    },
    viral: {
      id: 'viral',
      title: 'It goes viral',
      turningPoint: true,
      image: slot('adv-insta-viral', 'turning_point', 'A man sitting at an office desk staring at his phone, surrounded by floating simple heart and comment shapes, a colleague glancing over his shoulder.', 'Tariq at work seeing the viral post.'),
      passages: [
        { text: 'The post goes viral. 300,000 views. Strangers speculate about their marriage. Tariq’s colleagues have seen it.' },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you do first?',
        choices: [],
        byRole: {
          A: [
            { id: 'call', label: 'Call Rania: “Can we talk tonight? I’m not angry, I’m exposed.”', effects: { vars: { trust: 1 } }, next: 'comments', beat: 'Tariq called Rania to say he felt exposed, not angry.' },
            { id: 'cold', label: 'Go cold. Say nothing until she notices.', effects: { vars: { closeness: -1 } }, next: 'comments', beat: 'Tariq went cold and waited for her to notice.' },
            { id: 'demand', label: 'Message: “Delete it. Now.”', effects: { vars: { trust: -1 } }, next: 'comments', beat: 'Tariq demanded she delete it.' },
          ],
          B: [
            { id: 'delete', label: 'Take it down and call Tariq.', effects: { vars: { privacy: 1, trust: 1 } }, next: 'comments', beat: 'Rania took the post down and called Tariq.' },
            { id: 'ride', label: 'Leave it up, the engagement is good for her account.', effects: { vars: { privacy: -1, trust: -1 }, flags: ['left_up'] }, next: 'comments', beat: 'Rania left the post up for the engagement.' },
            { id: 'explain', label: 'Post a follow-up saying they’re fine.', effects: { vars: { privacy: -1 } }, next: 'comments', beat: 'Rania posted a follow-up saying they were fine.' },
          ],
        },
        combos: [
          { pair: ['call', 'delete'], next: 'boundaries', beat: 'Their calls crossed, he called to talk, she had already taken it down.', effects: { vars: { trust: 2, closeness: 1 } } },
          { pair: ['demand', 'ride'], next: 'comments', beat: 'He demanded she delete it; she refused. The comments kept coming.', effects: { vars: { trust: -2 } } },
          { pair: ['cold', 'explain'], next: 'comments', beat: 'He went silent; she told 300,000 strangers they were fine.', effects: { vars: { closeness: -1 } } },
        ],
        diverge: 'comments',
      },
    },
    comments: {
      id: 'comments',
      title: 'The comment section',
      image: slot('adv-insta-comments', 'scene', 'A young woman sitting on the floor against a bed late at night scrolling her phone, face lit by the screen, looking hurt, many comment shapes floating.', 'Rania reading comments late at night.'),
      passages: [{ text: 'The comments turn: some say Tariq sounds controlling, others say Rania is exploiting her marriage.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Tariq. Rania is hurting. What do you do?',
        choices: [
          { id: 'protect', label: 'Sit with her, take her phone gently, and make tea.', effects: { vars: { closeness: 2 } }, next: 'boundaries', beat: 'Tariq sat with Rania and gently took her phone away.' },
          { id: 'told_you', label: '“This is exactly what I was worried about.”', effects: { vars: { closeness: -1, trust: -1 } }, next: 'boundaries', beat: 'Tariq told Rania this was what he had warned about.' },
        ],
      },
    },
    boundaries: {
      id: 'boundaries',
      title: 'What stays private',
      turningPoint: true,
      image: slot('adv-insta-boundaries', 'turning_point', 'A couple sitting cross-legged on a bed with a notebook between them, listing two columns, a phone face down on the duvet.', 'Tariq and Rania listing what stays private.'),
      passages: [{ text: 'They finally talk about what is shareable and what is theirs alone.' }],
      lessons: [{ id: 'pp-l-joint', tag: 'Joint decision', text: 'Choose together. A mismatch means talk, then choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what’s the rule from now on?',
        choices: [
          { id: 'never_conflict', label: 'Never post about conflict, and Tariq approves any post he’s in.', effects: { vars: { privacy: 2, trust: 1 }, flags: ['rules'] }, next: 'campaign', beat: 'They agreed never to post conflict, and Tariq approves any post he is in.' },
          { id: 'no_husband', label: 'Rania keeps creating, but Tariq is never on camera.', effects: { vars: { privacy: 2 }, flags: ['offscreen'] }, next: 'campaign', beat: 'They agreed Tariq would stay off camera entirely.' },
          { id: 'private', label: 'Make the account private for a while.', effects: { vars: { privacy: 3, closeness: 1 }, flags: ['went_private'] }, next: 'campaign', beat: 'They agreed to make the account private for a while.' },
        ],
      },
    },
    campaign: {
      id: 'campaign',
      title: 'The campaign',
      image: slot('adv-insta-campaign', 'scene', 'A woman in modest fashion posing for a phone camera on a tripod in a sunny living room, her husband reading on the sofa out of frame, relaxed.', 'Rania filming while Tariq reads out of frame.'),
      passages: [
        { text: 'The brand is still waiting for an answer about the campaign.' },
        { text: 'The account is private now. The brand is not thrilled.', when: { flag: 'went_private' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Rania. What do you tell the brand?',
        choices: [
          { id: 'solo', label: 'Do it alone, on her terms.', effects: { vars: { privacy: 1, trust: 1 } }, next: { routes: endingRoutes() }, beat: 'Rania did the campaign alone, on her terms.' },
          { id: 'decline', label: 'Decline. It isn’t worth what it costs at home.', effects: { vars: { closeness: 1 } }, next: { routes: endingRoutes() }, beat: 'Rania declined the campaign for the sake of home.' },
          { id: 'couple', label: 'Do the couple content anyway, one last time.', effects: { vars: { trust: -2, privacy: -1 } }, next: { routes: endingRoutes() }, beat: 'Rania did the couple content anyway.' },
        ],
      },
    },
  },
  endings: {
    protected: {
      id: 'protected', title: 'A protected marriage', mood: 'renewed',
      image: slot('adv-insta-end-protected', 'outcome', 'A couple laughing together at a picnic in a park, no phones in sight, a blanket and thermos between them.', 'Tariq and Rania laughing at a picnic, phones away.'),
      whatHappened: 'Rania’s work thrives; their marriage stays off it. Tariq has started helping with her editing.',
      pattern: { name: 'Agreed boundaries', explanation: 'Clear, shared rules let one spouse’s public life and the other’s privacy coexist.' },
      couldHaveChanged: 'Agreeing those rules before the first sponsored post.',
      takeaway: 'Decide together what belongs to the public and what belongs to you.',
      epilogues: [{ text: 'Her followers notice she seems calmer. She is.', when: { var: 'closeness', gte: 3 } }],
      guide: [{ id: 'pp-e-rules', text: 'We agree together what we share online, and never post our conflicts.' }],
    },
    offscreen: {
      id: 'offscreen', title: 'Off camera', mood: 'steady',
      image: slot('adv-insta-end-offscreen', 'outcome', 'A woman filming herself making tea, a man’s hand only just visible at the edge of the frame passing her a cup.', 'Tariq’s hand passing Rania tea, just out of frame.'),
      whatHappened: 'Her followers know she is married. They never see him. He likes it that way; so does she, eventually.',
      pattern: { name: 'Separate lanes', explanation: 'Each kept what mattered to them without forcing the other.' },
      couldHaveChanged: 'Starting there, before the brand ever asked.',
      takeaway: 'A spouse’s privacy is theirs to choose, not yours to spend.',
      guide: [{ id: 'pp-e-consent', text: 'Neither of us shares the other online without asking.' }],
    },
    quiet: {
      id: 'quiet', title: 'The quiet season', mood: 'tender',
      image: slot('adv-insta-end-quiet', 'outcome', 'A couple on a balcony at sunset with tea, a phone lying face down on a small table, both looking out at the city.', 'Tariq and Rania on a balcony, phone face down.'),
      whatHappened: 'The account stays private for six months. Rania misses it, then doesn’t. They feel like themselves again.',
      pattern: { name: 'Stepping back to protect', explanation: 'Pausing the public life gave the private one room to heal.' },
      couldHaveChanged: 'A smaller step might have kept her income.',
      takeaway: 'Sometimes protecting the marriage means a quieter season.',
      guide: [{ id: 'pp-e-pause', text: 'If something outside starts hurting us, we pause it.' }],
    },
    exposed: {
      id: 'exposed', title: 'Exposed', mood: 'strained',
      image: slot('adv-insta-end-exposed', 'outcome', 'A man sitting alone in a dark living room lit only by a phone screen showing a couple photo, looking tired and distant.', 'Tariq alone with a couple photo on his phone.'),
      whatHappened: 'The couple content went live. Tariq is polite. He has stopped telling Rania anything personal.',
      pattern: { name: 'Privacy spent without consent', explanation: 'One spouse’s comfort became the other’s product.' },
      couldHaveChanged: 'Asking him first, and taking no for an answer.',
      takeaway: 'Trust is the one thing you cannot monetise.',
      guide: [{ id: 'pp-e-trust', text: 'We never trade the other’s privacy for anything.' }],
    },
    engagement: {
      id: 'engagement', title: 'Good for engagement', mood: 'fragile',
      image: slot('adv-insta-end-engagement', 'outcome', 'A woman smiling into a ring light while, out of focus behind her, her husband walks out of the room.', 'Rania filming while Tariq leaves the room behind her.'),
      whatHappened: 'The viral post stayed up and the account doubled. The marriage feels thinner.',
      pattern: { name: 'Audience over spouse', explanation: 'The approval of strangers outweighed the one person who mattered.' },
      couldHaveChanged: 'Taking it down the moment he said he felt exposed.',
      takeaway: 'Strangers’ attention is loud; your spouse’s hurt is quiet. Listen to the quiet one.',
      guide: [{ id: 'pp-e-listen', text: 'When one of us feels exposed, the post comes down.' }],
    },
    together: {
      id: 'together', title: 'Through it together', mood: 'tender',
      image: slot('adv-insta-end-together', 'outcome', 'A husband and wife sitting close on a sofa, she resting against him, his hand on hers, a phone switched off on the cushion.', 'Tariq and Rania close on the sofa, phone switched off.'),
      whatHappened: 'The worst week of her online life was the week he showed up most. She has not forgotten.',
      pattern: { name: 'Turning toward in crisis', explanation: 'He chose comfort over being right when she was hurting.' },
      couldHaveChanged: 'Not posting about the argument in the first place.',
      takeaway: 'When your spouse is hurting, comfort first; “I told you so” never.',
      guide: [{ id: 'pp-e-comfort', text: 'When one of us is hurting, we comfort first and talk later.' }],
    },
    compromise: {
      id: 'compromise', title: 'Working it out', mood: 'steady',
      image: slot('adv-insta-end-compromise', 'outcome', 'A couple at a kitchen table reviewing photos on a laptop together, the woman pointing, the man nodding, cups of coffee.', 'Tariq and Rania reviewing photos together.'),
      whatHappened: 'They are still negotiating what is shareable, post by post. It is slow, but it is together.',
      pattern: { name: 'Ongoing negotiation', explanation: 'Clear rules were not set, but the habit of asking was.' },
      couldHaveChanged: 'A written agreement would save them some arguments.',
      takeaway: 'Asking each time is good; agreeing the rules once is better.',
      epilogues: [{ text: 'The viral week still comes up in arguments.', when: { var: 'trust', lte: 0 } }],
      guide: [{ id: 'pp-e-ask', text: 'We ask before posting anything about us.' }],
    },
    cold: {
      id: 'cold', title: 'Cold war, online and off', mood: 'strained',
      image: slot('adv-insta-end-cold', 'outcome', 'A couple in the same room each on their own phone, sitting far apart on a long sofa, harsh blue screen light.', 'Tariq and Rania on their phones at opposite ends of the sofa.'),
      whatHappened: 'Neither apologised. Rania posts less. They talk even less.',
      pattern: { name: 'Mutual withdrawal', explanation: 'Both protected themselves and left the marriage unprotected.' },
      couldHaveChanged: 'One of them reaching out on the night of the viral post.',
      takeaway: 'Silence after a public hurt only makes it private and permanent.',
      guide: [{ id: 'pp-e-silence', text: 'After a hurt, one of us reaches out within a day.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ var: 'trust', lte: -3 }, { var: 'privacy', lte: -2 }] }, to: 'end:exposed' },
    { when: { flag: 'left_up' }, to: 'end:engagement' },
    { when: { var: 'closeness', lte: -2 }, to: 'end:cold' },
    { when: { flag: 'went_private' }, to: 'end:quiet' },
    { when: { all: [{ flag: 'rules' }, { var: 'trust', gte: 2 }] }, to: 'end:protected' },
    { when: { flag: 'offscreen' }, to: 'end:offscreen' },
    { when: { var: 'closeness', gte: 2 }, to: 'end:together' },
    { to: 'end:compromise' },
  ];
}
