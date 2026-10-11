import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Offer — a job abroad, an unwell father, and who gets to decide.
 * Hidden states: partnership, family, fulfilment.
 */
export const theOffer: Adventure = {
  id: 'adv-the-offer',
  kind: 'adventure',
  title: 'The Offer',
  tagline: 'A dream job in Dubai. A father who isn’t well. One decision for two.',
  description:
    'Hana is offered the role of her career — in Dubai, starting in three months. Idris’s father had a stroke last year. Play both of them through a decision about careers, money, family and where home is. Every path has a cost; the question is who chooses it.',
  minutes: 16,
  themes: ['Relocation', 'Careers', 'Money', 'Family pressure', 'Marriage roles'],
  cover: slot('adv-offer-cover', 'cover', 'A young woman holding a printed job offer letter at a kitchen table, a laptop showing a Dubai skyline, her husband in the background holding a phone with a family photo on it.', 'Hana holding a job offer letter while Idris looks at a family photo.'),
  roles: {
    A: { name: 'Idris', gender: 'male', sketch: 'An only son. Proud of Hana, worried about his father.' },
    B: { name: 'Hana', gender: 'female', sketch: 'Has worked towards this kind of role for eight years.' },
  },
  variables: {
    partnership: { label: 'Partnership', initial: 0, readings: ['They made it as two separate people.', 'They mostly decided together.', 'They decided as one team.'] },
    family: { label: 'Family ties', initial: 0, readings: ['The family feels let down.', 'The family has accepted it.', 'The family feels honoured and included.'] },
    fulfilment: { label: 'Hana’s fulfilment', initial: 0, readings: ['Hana feels she gave up something of herself.', 'Hana is at peace with how it went.', 'Hana feels she is becoming who she hoped to be.'] },
  },
  start: 'the_email',
  scenes: {
    the_email: {
      id: 'the_email',
      title: 'The email',
      image: slot('adv-offer-email', 'scene', 'A woman at her desk at night, laptop open, hand over her mouth in surprise, the subject line “Offer of employment” glowing.', 'Hana reading a job offer email in surprise.'),
      passages: [
        { text: 'Tuesday, 10pm. Hana opens the email: Head of Product, Dubai. Twice her salary. Start in three months.' },
        { text: 'She applied on a whim. She never expected to get it. Idris is downstairs, on the phone to his father, who had a stroke last year and is still recovering.' },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hana. What do you do?',
        choices: [
          { id: 'tell', label: 'Run downstairs and tell Idris straight away.', effects: { vars: { partnership: 1 }, flags: ['told_first'] }, next: 'idris_reacts', beat: 'Hana told Idris about the offer the moment she saw it.' },
          { id: 'sit', label: 'Keep it to herself for a few days to think.', effects: { flags: ['delayed'] }, next: 'idris_finds', beat: 'Hana kept the offer to herself for a few days.', lesson: { id: 'o-l-sit', tag: 'Notice this', text: 'Thinking first is reasonable. The risk is that someone else tells him before you do.' } },
          { id: 'decline', label: 'Decline tonight. Family comes first.', effects: { vars: { fulfilment: -2 }, flags: ['declined_alone'] }, next: 'quiet_regret', beat: 'Hana declined the offer that night without telling Idris.', lesson: { id: 'o-l-sacrifice', tag: 'Notice this', text: 'A sacrifice your spouse never knew about is one they can’t appreciate — or question.' } },
        ],
      },
    },

    idris_reacts: {
      id: 'idris_reacts',
      title: 'Downstairs',
      image: slot('adv-offer-react', 'scene', 'A young man in a living room lowering his phone, turning toward his wife who stands in the doorway holding a laptop and beaming, his expression caught between pride and worry.', 'Idris reacting as Hana shares the news.'),
      passages: [{ text: 'Idris hangs up with his father as Hana appears in the doorway, holding her laptop, eyes shining.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What is your first reaction?',
        choices: [
          { id: 'congrats', label: '“That’s incredible! Tell me everything.”', effects: { vars: { partnership: 1, fulfilment: 1 } }, next: 'first_talk', beat: 'Idris celebrated with her first.' },
          { id: 'dad', label: '“Dubai? What about my dad?”', effects: { vars: { family: 1, partnership: -1 }, flags: ['dad_first'] }, next: 'first_talk', beat: 'Idris’s first words were about his father.', lesson: { id: 'o-l-first', tag: 'Rule 2', text: 'His worry is real — but leading with it means Hana’s joy went unheard.' } },
          { id: 'quiet', label: '“Wow. We’ll see.” And go quiet.', effects: { vars: { partnership: -1 }, flags: ['withheld'] }, next: 'first_talk', beat: 'Idris said “we’ll see” and went quiet.' },
        ],
      },
    },

    idris_finds: {
      id: 'idris_finds',
      title: 'At her parents’ dinner',
      image: slot('adv-offer-dinner', 'scene', 'A lively family dinner table, a smiling sister raising a cup toward a young man whose polite smile hides confusion, his wife beside him looking down.', 'Idris hearing the news from Hana\'s sister at dinner.'),
      passages: [{ text: 'Saturday dinner at Hana’s parents. Her sister beams at Idris: “Dubai! You must be so proud!” Idris smiles. He has no idea what she means.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What do you do?',
        choices: [
          { id: 'gentle', label: 'Wait until home: “I heard about Dubai tonight. I wish I’d heard it from you.”', next: 'first_talk', beat: 'Idris waited until they were home and raised it gently.' },
          { id: 'confront', label: 'In the car: “Why am I the last to know?”', effects: { vars: { partnership: -1 } }, next: 'first_talk', beat: 'Idris confronted Hana in the car.' },
          { id: 'hide', label: 'Say nothing, and feel quietly hurt.', effects: { vars: { partnership: -1 }, flags: ['hurt_hidden'] }, next: 'family_hears', beat: 'Idris said nothing and nursed the hurt.', lesson: { id: 'o-l-hidden', tag: 'Pattern forming', text: 'A hurt kept quiet tends to come out sideways — usually in the decision itself.' } },
        ],
      },
    },

    quiet_regret: {
      id: 'quiet_regret',
      title: 'Three weeks later',
      image: slot('adv-offer-regret', 'scene', 'A young woman sitting on a bed folding laundry slowly, staring into the distance, her husband in the doorway noticing her quiet sadness.', 'Idris noticing Hana\'s quiet sadness.'),
      passages: [{ text: 'Hana has been flat for weeks. One evening she mentions, almost in passing: “I was offered a job in Dubai. I said no.”' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What do you say?',
        choices: [
          { id: 'reopen', label: '“You turned it down without telling me? Is there still time to talk about it?”', effects: { vars: { partnership: 1 }, flags: ['reopened'] }, next: 'first_talk', beat: 'Idris asked whether it was too late to decide together.' },
          { id: 'thank', label: '“That means a lot. Thank you for putting family first.”', effects: { vars: { fulfilment: -1, family: 1 } }, next: 'year_later', beat: 'Idris thanked Hana for her sacrifice and let it rest.' },
        ],
      },
    },

    first_talk: {
      id: 'first_talk',
      title: 'What matters most',
      turningPoint: true,
      image: slot('adv-offer-talk', 'turning_point', 'A couple sitting at opposite sides of a kitchen table late at night, each writing privately on a small card, a single lamp between them.', 'Idris and Hana each writing privately on a card.'),
      passages: [
        { text: 'They sit down to talk properly. Before they start, Hana suggests they each write down, privately, what matters most to them.' },
        { text: 'The company has agreed to hold the role for a month while she reconsiders.', when: { flag: 'reopened' } },
      ],
      lessons: [{ id: 'o-l-private', tag: 'Private choice', text: 'Choose for your own character. You will both see the cards at once.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you write down?',
        choices: [],
        byRole: {
          A: [
            { id: 'father', label: 'Being here for my father.', effects: { vars: { family: 1 }, flags: ['a_father'] }, next: 'family_hears', beat: 'Idris wrote: being here for my father.' },
            { id: 'future', label: 'Our savings and our future children.', effects: { flags: ['a_money'] }, next: 'family_hears', beat: 'Idris wrote: our savings and our future.' },
            { id: 'dream', label: 'Hana getting to do this.', effects: { vars: { fulfilment: 1 }, flags: ['a_dream'] }, next: 'family_hears', beat: 'Idris wrote: Hana getting to do this.' },
          ],
          B: [
            { id: 'career', label: 'This chance — it may not come again.', effects: { vars: { fulfilment: 1 }, flags: ['b_career'] }, next: 'family_hears', beat: 'Hana wrote: this chance may not come again.' },
            { id: 'near', label: 'Staying near both our families.', effects: { vars: { family: 1 }, flags: ['b_family'] }, next: 'family_hears', beat: 'Hana wrote: staying near our families.' },
            { id: 'idris', label: 'Whatever Idris truly wants.', effects: { flags: ['b_defer'] }, next: 'family_hears', beat: 'Hana wrote: whatever Idris truly wants.' },
          ],
        },
        combos: [
          { pair: ['dream', 'near'], next: 'generous_stalemate', beat: 'Idris wrote Hana’s dream; Hana wrote his family. Each had chosen the other.', effects: { vars: { partnership: 1 } } },
          { pair: ['dream', 'idris'], next: 'generous_stalemate', beat: 'Each of them wrote down what the other wanted.', effects: { vars: { partnership: 1 } } },
          { pair: ['father', 'career'], next: 'family_hears', beat: 'Their cards pointed in opposite directions: his father, her career.', effects: { vars: { partnership: -1 } } },
          { pair: ['future', 'career'], next: 'options', beat: 'Both cards, in different words, said “our future”. The money mattered to both.', effects: { vars: { partnership: 1 } } },
          { pair: ['father', 'near'], next: 'options', beat: 'Both wrote down family.', effects: { vars: { family: 1, fulfilment: -1 } } },
        ],
        diverge: 'family_hears',
      },
    },

    generous_stalemate: {
      id: 'generous_stalemate',
      title: 'After you',
      image: slot('adv-offer-stalemate', 'scene', 'A couple sitting at a table each sliding a card toward the other, both smiling helplessly, two cups of tea going cold.', 'Idris and Hana each insisting on the other\'s wish.'),
      passages: [{ text: '“You should take it.” “No — your dad.” “But it’s your dream.” Neither will choose for themselves.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: how do you get unstuck?',
        choices: [
          { id: 'list', label: 'Write out every option, however unlikely.', next: 'options', beat: 'They wrote out every option together.' },
          { id: 'istikhara', label: 'Both pray istikhara and set a date to decide.', effects: { vars: { partnership: 1 }, flags: ['istikhara'] }, next: 'options', beat: 'They both prayed istikhara and set a date to decide.' },
        ],
      },
    },

    family_hears: {
      id: 'family_hears',
      title: 'His mother calls',
      turningPoint: true,
      image: slot('adv-offer-mother', 'turning_point', 'A man standing by a window on the phone, eyes closed, while a woman watches him from across the room, a suitcase-shaped shadow on the wall.', 'Idris on the phone with his mother while Hana watches.'),
      passages: [
        { text: 'Somehow, Idris’s mother has heard. She calls him, crying. “You can’t take my only son away while your father is like this.”' },
        { text: 'He is still hurt that he heard about Dubai from Hana’s sister.', when: { flag: 'hurt_hidden' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What do you tell his mother?',
        choices: [
          { id: 'ours', label: '“It’s a decision Hana and I will make together, Mum — and we’ll think about you and Dad in it.”', effects: { vars: { partnership: 1, family: -1 } }, next: 'options', beat: 'Idris told his mother it was a decision for him and Hana to make together.', lesson: { id: 'o-l-ours', tag: 'Boundary', text: 'Including family in your thinking is different from handing them the decision.' } },
          { id: 'promise', label: '“Don’t worry, Mum. We’re not going anywhere.”', effects: { vars: { family: 2, partnership: -2 }, flags: ['promised'] }, next: 'hana_learns', beat: 'Idris promised his mother they would not go — before deciding with Hana.' },
          { id: 'blame', label: '“It’s Hana’s job, Mum, not my idea.”', effects: { vars: { partnership: -2, family: -1 }, flags: ['blamed_hana'] }, next: 'hana_learns', beat: 'Idris told his mother the whole thing was Hana’s idea.', lesson: { id: 'o-l-blame', tag: 'Notice this', text: 'Putting it on Hana keeps him safe with his mother and sets his wife against her.' } },
        ],
      },
    },

    hana_learns: {
      id: 'hana_learns',
      title: 'Hana hears',
      image: slot('adv-offer-learns', 'scene', 'A young woman in a hijab standing in a kitchen holding a phone slightly away from her ear, her face stunned, afternoon light.', 'Hana stunned by a call from her mother-in-law.'),
      passages: [
        { text: 'Hana’s mother-in-law calls her. “Thank you for staying, dear. Idris told me.”', when: { flag: 'promised' } },
        { text: 'Hana’s mother-in-law messages her: “I hope you’ll think about what you’re asking of my son.”', when: { flag: 'blamed_hana' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hana. What do you do?',
        choices: [
          { id: 'calm', label: '“I need us to decide together before anyone else is told anything.”', effects: { vars: { partnership: 1 } }, next: 'options', beat: 'Hana asked calmly that they decide together before telling anyone.' },
          { id: 'accuse', label: '“So your mother decides our life now?”', effects: { vars: { partnership: -1 } }, next: 'options', beat: 'Hana accused Idris of letting his mother decide.' },
          { id: 'accept', label: 'Say nothing. Let it go. Resent it quietly.', effects: { vars: { fulfilment: -2 }, flags: ['resented'] }, next: 'staying', beat: 'Hana accepted it without a word and resented it.', lesson: { id: 'o-l-resent', tag: 'Pattern forming', text: 'Notice how a decision is becoming resentment. Silent agreement isn’t agreement.' } },
        ],
      },
    },

    options: {
      id: 'options',
      title: 'The options',
      turningPoint: true,
      image: slot('adv-offer-options', 'turning_point', 'A couple’s hands arranging four paper cards on a table, each card showing a simple drawing: a plane, a house, a laptop, a heart.', 'Four option cards laid out on a table.'),
      passages: [
        { text: 'The options are on the table. None of them is free.' },
        { text: 'Both of them prayed istikhara this week. Neither feels certain, but both feel calmer.', when: { flag: 'istikhara' } },
      ],
      decision: {
        mode: 'joint',
        prompt: 'Together: what do you choose?',
        choices: [
          { id: 'trial', label: 'Go to Dubai for two years, with a review after one.', effects: { flags: ['went'], vars: { fulfilment: 2, family: -1 } }, next: 'dubai', beat: 'They chose two years in Dubai with a review after one.' },
          { id: 'support', label: 'Go — and use the extra income for his father’s care and frequent visits.', effects: { flags: ['went', 'funded_care'], vars: { fulfilment: 2 } }, next: 'dubai', beat: 'They chose Dubai and to fund his father’s care and regular visits.' },
          { id: 'negotiate', label: 'Stay — Hana negotiates a hybrid version of the role.', effects: { flags: ['negotiated'] }, next: 'negotiation', beat: 'They chose to stay and try to negotiate a hybrid role.' },
          { id: 'stay', label: 'Stay. Decline the offer.', effects: { flags: ['stayed'], vars: { family: 1, fulfilment: -1 } }, next: 'staying', beat: 'They chose to stay and decline.' },
        ],
      },
    },

    negotiation: {
      id: 'negotiation',
      title: 'The counter-offer',
      image: slot('adv-offer-negotiate', 'scene', 'A young woman in a smart hijab on a video call at a home desk, confident and composed, notes beside her, her husband in the background giving a thumbs-up.', 'Hana negotiating on a video call.'),
      passages: [{ text: 'The company is interested but cautious: “We could do London-based, with one week a month in Dubai.”' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hana. What do you do?',
        choices: [
          { id: 'take', label: 'Take it — one week a month.', effects: { vars: { fulfilment: 1 } }, next: 'staying', beat: 'Hana accepted a London role with monthly trips.' },
          { id: 'push', label: 'Push for fully remote, with Idris’s support behind her.', when: { var: 'partnership', gte: 1 }, effects: { vars: { fulfilment: 2 } }, next: 'staying', beat: 'With Idris behind her, Hana negotiated a fully remote role.' },
          { id: 'walk', label: 'Walk away — half a dream feels worse than none.', effects: { vars: { fulfilment: -1 } }, next: 'staying', beat: 'Hana walked away from the counter-offer.' },
        ],
      },
    },

    dubai: {
      id: 'dubai',
      title: 'Six months in',
      image: slot('adv-offer-dubai', 'scene', 'A couple on a high apartment balcony in Dubai at dusk, the man on a video call with an older man in a hospital bed, the woman with a hand on his shoulder.', 'Idris on a video call with his father from a Dubai balcony.'),
      passages: [
        { text: 'Dubai is bright and busy. Hana is thriving. Then the call: Idris’s father has had a fall.' },
        { text: 'The carers they pay for found him quickly. He is shaken, not badly hurt.', when: { flag: 'funded_care' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you each think should happen?',
        choices: [
          { id: 'month', label: 'Idris flies back for a month.', effects: { vars: { family: 1 } }, next: 'dubai_settles', beat: 'One of them wanted Idris to fly back for a month.' },
          { id: 'home', label: 'We all go home, for good.', effects: { vars: { family: 2, fulfilment: -2 }, flags: ['came_home'] }, next: 'homecoming', beat: 'One of them wanted to go home for good.' },
          { id: 'carers', label: 'More care for him; we visit more often.', next: 'dubai_strain', beat: 'One of them wanted more care and more visits.' },
        ],
        combos: [
          { pair: ['month', 'carers'], next: 'dubai_settles', beat: 'Idris would go back for a month, and they would add more care afterwards.', effects: { vars: { partnership: 1 } } },
          { pair: ['home', 'carers'], next: 'dubai_strain', beat: 'One wanted to go home for good; the other wanted to stay and add care. They stayed — not quite agreed.', effects: { vars: { partnership: -1 } } },
          { pair: ['home', 'month'], next: 'homecoming', beat: 'One wanted a month; the other wanted to go home for good. They went home.', effects: { flags: ['came_home'], vars: { fulfilment: -1 } } },
        ],
        diverge: 'dubai_strain',
      },
    },

    dubai_strain: {
      id: 'dubai_strain',
      title: 'Guilt',
      image: slot('adv-offer-strain', 'scene', 'A man alone in a glass office at night in a high-rise, working late, a family photo face down on the desk, city lights below.', 'Idris working late in Dubai.'),
      passages: [{ text: 'Idris is working late more often. He doesn’t say why. Hana suspects she knows.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What do you do?',
        choices: [
          { id: 'say', label: '“I feel guilty every day we’re here. I need you to know that.”', effects: { vars: { partnership: 1 } }, next: 'year_later', beat: 'Idris told Hana about his guilt.' },
          { id: 'bury', label: 'Keep it to himself and work longer hours.', effects: { flags: ['buried_guilt'], vars: { partnership: -1 } }, next: 'year_later', beat: 'Idris buried his guilt in work.', lesson: { id: 'o-l-bury', tag: 'Rule 1', text: 'Guilt left unsaid often turns into distance — or blame.' } },
        ],
      },
    },

    dubai_settles: {
      id: 'dubai_settles',
      title: 'A rhythm',
      image: slot('adv-offer-settles', 'scene', 'A couple on a video call with an older man sitting in a garden in a cardigan, all laughing, a calendar on the wall marked with visit dates.', 'Idris and Hana on a happy call with his father.'),
      passages: [{ text: 'Idris spends a month at home. His father improves. They find a rhythm: calls every evening, visits every few months.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hana. What do you do?',
        choices: [
          { id: 'cut', label: 'Offer to drop to four days a week so visits are easier.', effects: { vars: { partnership: 1, family: 1 } }, next: 'year_later', beat: 'Hana offered to work four days so they could visit more.' },
          { id: 'go', label: 'Keep going at full speed — this is the window.', effects: { vars: { fulfilment: 1 } }, next: 'year_later', beat: 'Hana kept going at full speed.' },
        ],
      },
    },

    homecoming: {
      id: 'homecoming',
      title: 'Home',
      image: slot('adv-offer-homecoming', 'scene', 'An airport arrivals hall, an older man with a walking stick hugging his son, a young woman beside them with luggage, eyes wet, both happy and wistful.', 'A family reunion at the airport.'),
      passages: [{ text: 'They fly home with eleven boxes and a lot of feelings. Idris’s father cries at the airport.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hana. How do you handle it?',
        choices: [
          { id: 'new', label: 'Throw herself into finding a new role at home.', next: 'year_later', beat: 'Hana threw herself into finding a new role.' },
          { id: 'grieve', label: 'Tell Idris honestly that she is grieving the job.', effects: { vars: { partnership: 1 } }, next: 'year_later', beat: 'Hana told Idris honestly that she was grieving the job.', lesson: { id: 'o-l-grieve', tag: 'Validation', text: 'Choosing something together doesn’t mean neither of you lost anything.' } },
        ],
      },
    },

    staying: {
      id: 'staying',
      title: 'Staying',
      image: slot('adv-offer-staying', 'scene', 'A young man helping his elderly father walk in a garden on a sunny afternoon while his wife works on a laptop at a garden table nearby.', 'Idris helping his father walk as Hana works nearby.'),
      passages: [
        { text: 'They stay. Idris’s father slowly gets stronger.' },
        { text: 'Hana still thinks about the email at least once a day.', when: { flag: 'resented' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Idris. What do you do?',
        choices: [
          { id: 'carry', label: 'Take on more of his father’s care, so Hana can push her career here.', effects: { vars: { partnership: 1, fulfilment: 1 } }, next: 'year_later', beat: 'Idris took on more of his father’s care so Hana could grow her career.' },
          { id: 'assume', label: 'Assume Hana will help with the visits too, as before.', effects: { vars: { fulfilment: -1 } }, next: 'year_later', beat: 'Idris assumed Hana would carry the visits as before.' },
        ],
      },
    },

    year_later: {
      id: 'year_later',
      title: 'One year later',
      turningPoint: true,
      image: slot('adv-offer-year', 'turning_point', 'A couple sitting on a garden bench in autumn, a year older, looking at a calendar on a phone together, leaves falling.', 'Idris and Hana on a bench a year later.'),
      passages: [{ text: 'A year since the email. One evening, Hana asks: “Can we talk about how this year has really been?”' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: do you look back honestly?',
        choices: [
          { id: 'honest', label: 'Yes — properly, including what it cost each of you.', effects: { vars: { partnership: 1 } }, next: { routes: endingRoutes() }, beat: 'A year on, they looked back honestly at what it had cost.' },
          { id: 'peace', label: 'Keep the peace. It’s done; why reopen it?', effects: { flags: ['no_review'] }, next: { routes: endingRoutes() }, beat: 'A year on, they chose not to look back.' },
        ],
      },
    },
  },
  endings: {
    the_promise: {
      id: 'the_promise',
      title: 'The promise',
      mood: 'strained',
      image: slot('adv-offer-end-promise', 'outcome', 'A woman looking out of a rainy London window holding a mug, an old printed job offer pinned to a corkboard behind her.', 'Hana at a rainy window, the old offer pinned behind her.'),
      whatHappened: 'They stayed because Idris promised his mother before he asked his wife. Hana has never quite forgiven the order it happened in.',
      pattern: { name: 'Deciding for two', explanation: 'A shared decision was made by one person and a parent — the spouse was informed, not consulted.' },
      couldHaveChanged: 'Idris saying to his mother: “Hana and I will decide this together.” The outcome might have been the same; the marriage would not.',
      takeaway: 'How a decision is made matters as much as what is decided.',
      guide: [{ id: 'o-e-together', text: 'We make major decisions together before telling family.' }],
    },
    both_and: {
      id: 'both_and',
      title: 'Both, and',
      mood: 'renewed',
      image: slot('adv-offer-end-both', 'outcome', 'An older man with a walking stick laughing on a video call on a tablet held by a young couple, half their faces lit by sunset.', 'Idris’s father laughing on a video call with the couple.'),
      whatHappened: 'Hana’s career grows, Idris’s father is cared for and close, and the decision belongs to both of them.',
      pattern: { name: 'Shared decision-making', explanation: 'They put every option on the table, listened to each other’s fears, and chose together.' },
      couldHaveChanged: 'Little. The hardest days were the early ones, before they started talking as a team.',
      takeaway: 'The answer is often not either/or, once you stop deciding alone.',
      epilogues: [{ text: 'Idris’s mother now tells everyone about “my daughter-in-law in Dubai”.', when: { flag: 'went' } }],
      guide: [{ id: 'o-e-options', text: 'For big decisions, we lay out every option before choosing.' }],
    },
    distance_guilt: {
      id: 'distance_guilt',
      title: 'Far from home',
      mood: 'fragile',
      image: slot('adv-offer-end-guilt', 'outcome', 'A man alone in a glass office at night overlooking a city, phone face down on the desk, a family photo beside it.', 'Idris alone in an office at night beside a family photo.'),
      whatHappened: 'Dubai is going well on paper. Idris carries a guilt he has never put into words, and it is turning into distance.',
      pattern: { name: 'Buried feelings', explanation: 'An unspoken feeling did not go away; it went underground.' },
      couldHaveChanged: 'Idris saying, once, “I feel guilty every day we are here.”',
      takeaway: 'Feelings you don’t share still shape the marriage — you just can’t see how.',
      guide: [{ id: 'o-e-say', text: 'We say the hard feeling out loud, even when the decision is made.' }],
    },
    home_again: {
      id: 'home_again',
      title: 'Home again',
      mood: 'bittersweet',
      image: slot('adv-offer-end-home', 'outcome', 'A family Friday lunch in a modest home, an older man at the head of the table, a young woman smiling but a little wistful, moving boxes still in the corner.', 'A family lunch at home, with moving boxes in the corner.'),
      whatHappened: 'They came back for his father. The family is whole again. Hana gave up something real.',
      pattern: { name: 'Honourable sacrifice', explanation: 'The choice was right for the family — and still a loss for Hana.' },
      couldHaveChanged: 'Naming that loss together, so it does not become a debt.',
      takeaway: 'A sacrifice is lighter when it is seen and shared.',
      epilogues: [
        { text: 'Hana and Idris talk about it openly. It stings less each month.', when: { var: 'partnership', gte: 2 } },
        { text: 'Nobody has asked Hana how she feels about it.', when: { var: 'partnership', lte: 0 } },
      ],
      guide: [{ id: 'o-e-loss', text: 'When one of us gives something up, we name it and honour it.' }],
    },
    road_not_taken: {
      id: 'road_not_taken',
      title: 'The road not taken',
      mood: 'bittersweet',
      image: slot('adv-offer-end-road', 'outcome', 'A woman walking alone on a quiet road at dusk that forks, glancing back at the other path lit by distant city lights.', 'Hana walking a road, glancing back at the other path.'),
      whatHappened: 'Life is good and steady. But Hana feels she gave up a piece of who she was going to be — and isn’t sure Idris knows.',
      pattern: { name: 'Silent sacrifice', explanation: 'When one spouse quietly gives something up, it can become an invisible debt.' },
      couldHaveChanged: 'Deciding out loud and together — even if they still stayed.',
      takeaway: 'Don’t sacrifice in secret. Let your spouse share the cost.',
      guide: [{ id: 'o-e-secret', text: 'Neither of us makes a big sacrifice in secret.' }],
    },
    separate_decisions: {
      id: 'separate_decisions',
      title: 'Two separate decisions',
      mood: 'strained',
      image: slot('adv-offer-end-separate', 'outcome', 'Two people in the same kitchen each on their own laptop, backs to each other, two separate calendars on the wall.', 'Idris and Hana working back to back in their kitchen.'),
      whatHappened: 'Each of them made their own moves — with family, with work, alone. They live in the result together, but neither feels it was theirs.',
      pattern: { name: 'Parallel decision-making', explanation: 'They acted as two individuals managing a situation, not a couple facing one.' },
      couldHaveChanged: 'Sitting down early, writing down what mattered, and deciding as one.',
      takeaway: 'A marriage is a shared decision-maker — or it becomes two roommates.',
      guide: [{ id: 'o-e-team', text: 'Big decisions are ours, not mine or yours.' }],
    },
    new_shape: {
      id: 'new_shape',
      title: 'A new shape',
      mood: 'steady',
      image: slot('adv-offer-end-shape', 'outcome', 'A woman working on a laptop at a kitchen table in London, a boarding pass beside her, her husband bringing her tea, sunlight.', 'Hana working from home with a boarding pass, Idris bringing tea.'),
      whatHappened: 'Not the job as offered — a new version of it. Hana works from London with trips to Dubai. It is not perfect, but it is theirs.',
      pattern: { name: 'Creative compromise', explanation: 'Instead of choosing between two options, they made a third.' },
      couldHaveChanged: 'Asking for the hybrid version sooner, before the family pressure built.',
      takeaway: 'When both choices hurt someone, look for the one nobody has offered yet.',
      guide: [{ id: 'o-e-third', text: 'When we’re stuck between two options, we look for a third.' }],
    },
    decided_together: {
      id: 'decided_together',
      title: 'Decided together',
      mood: 'tender',
      image: slot('adv-offer-end-together', 'outcome', 'A couple holding hands across a café table with two cups, a calm closeness, a small notebook between them with a list.', 'Idris and Hana holding hands across a café table.'),
      whatHappened: 'Not everyone is happy with what they chose. But Idris and Hana both know it was their decision, made together.',
      pattern: { name: 'Shared ownership', explanation: 'Because both had a real voice, neither carries the decision alone.' },
      couldHaveChanged: 'Bringing the families in more gently might have eased the pressure.',
      takeaway: 'Make the decision together, and you can carry its cost together.',
      epilogues: [{ text: 'Every year on the date of the email, they review the decision over dinner.', when: { notFlag: 'no_review' } }],
      guide: [{ id: 'o-e-review', text: 'We review big decisions together after a year.' }],
    },
    still_deciding: {
      id: 'still_deciding',
      title: 'Still deciding',
      mood: 'steady',
      image: slot('adv-offer-end-still', 'outcome', 'A couple walking slowly along a river path at sunset, side by side, deep in conversation.', 'Idris and Hana walking by a river at sunset.'),
      whatHappened: 'The year went the way it went — some of it chosen, some of it simply happening. They are still talking about what it meant.',
      pattern: { name: 'Muddling through', explanation: 'Some of the decision was shared; some was left to circumstance and family.' },
      couldHaveChanged: 'More honesty early about what each of them truly wanted.',
      takeaway: 'Say what you want before you say what you will settle for.',
      epilogues: [{ text: 'They never did talk about what the year cost them.', when: { flag: 'no_review' } }],
      guide: [{ id: 'o-e-want', text: 'We say what we actually want before we compromise.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ flag: 'promised' }, { flag: 'resented' }] }, to: 'end:the_promise' },
    { when: { all: [{ var: 'partnership', gte: 4 }, { var: 'family', gte: 0 }, { var: 'fulfilment', gte: 1 }] }, to: 'end:both_and' },
    { when: { all: [{ flag: 'went' }, { flag: 'buried_guilt' }] }, to: 'end:distance_guilt' },
    { when: { flag: 'came_home' }, to: 'end:home_again' },
    { when: { var: 'partnership', lte: -2 }, to: 'end:separate_decisions' },
    { when: { var: 'fulfilment', lte: -2 }, to: 'end:road_not_taken' },
    { when: { all: [{ flag: 'negotiated' }, { var: 'fulfilment', gte: 1 }] }, to: 'end:new_shape' },
    { when: { var: 'partnership', gte: 2 }, to: 'end:decided_together' },
    { to: 'end:still_deciding' },
  ];
}
