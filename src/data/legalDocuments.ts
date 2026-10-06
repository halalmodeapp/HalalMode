/**
 * The Terms and Privacy Notice, in the words the app can actually stand behind.
 *
 * These describe what the code really does — what is stored, who can see it,
 * and what is never shown to anyone. They are written from the system rather
 * than from a template, which is the part a lawyer cannot do for us. Have a
 * lawyer review the wording before public launch; the facts here are correct,
 * the legal framing is not a substitute for advice.
 *
 * The versions must match `legal_document_registry` in the database, because
 * that is what members' acceptance is recorded against.
 */

export const LEGAL_VERSION = '2026-10-06';

/** Who runs the service. Shown in both documents and on halalmo.de/impressum. */
export const OPERATOR = {
  name: 'Halal Mode LLC',
  address: '1209 Mountain Road Pl NE, Ste R, Albuquerque, NM 87110, USA',
  email: 'hello@halalmo.de',
};

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: 'terms' | 'privacy';
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS: LegalDocument = {
  slug: 'terms',
  title: 'Terms of Service',
  updated: LEGAL_VERSION,
  intro:
    'Halal Mode introduces a small number of people to each other each day, for the purpose of marriage. These terms explain what we promise you, and what we ask of you in return. Halal Mode is run by Halal Mode LLC, 1209 Mountain Road Pl NE, Ste R, Albuquerque, NM 87110, USA.',
  sections: [
    {
      heading: 'Who can use Halal Mode',
      body: [
        'You must be 18 or older.',
        'You must be genuinely seeking marriage, and free to marry.',
        'One person, one account. Do not create an account for someone else, or pretend to be someone you are not.',
      ],
    },
    {
      heading: 'How introductions work',
      body: [
        'Each day you are shown a small set of people. Free members may show interest in up to three of them; Premium members see up to ten and may show interest in up to ten.',
        'Introductions are mutual. If someone appears in your set, you appear in theirs. Nobody is browsed without appearing themselves.',
        'Interest is private. If you choose someone and they do not choose you, they are never told. You will never be told that someone chose you unless you chose them back.',
        'We do not guarantee that you will be matched, or how many introductions you will receive on any given day. That depends on how many suitable people are available.',
      ],
    },
    {
      heading: 'What we ask of you',
      body: [
        'Be honest about who you are and what you are looking for.',
        'Treat everyone with respect, in every message.',
        'Do not harass, threaten, deceive, or pressure anyone.',
        'Do not share anyone else’s photographs, messages, or details outside the app.',
        'Do not use Halal Mode to advertise, recruit, or sell.',
      ],
    },
    {
      heading: 'Safety',
      body: [
        'You can block or report anyone you have been introduced to, at any time — even before accepting updated terms. Blocking is immediate and the other person is not told.',
        'If you choose not to see someone again, you are hidden from them too.',
        'We may suspend or remove an account that breaks these terms or puts other members at risk. Where we can, we will tell you why.',
        'New photographs and changes to your bio are checked automatically for breaches of these terms, with the help of an AI service. A photograph that clearly breaks them is taken off your profile; anything uncertain is decided by a person. Reports are always read by a person.',
        'If we remove content or restrict your account, you can ask us to look again by writing to hello@halalmo.de within six months. Someone who was not involved in the first decision will review it.',
        'Halal Mode is an introduction service. We do not verify identity, background, or intentions, and we cannot guarantee anyone’s honesty. Take the same care you would take meeting anyone new. Meet in public, tell someone where you are going, and involve your family as you see fit.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You can pause your profile or close your account at any time, from Settings.',
        'Closing your account hides your profile at once. After a 30-day recovery period your profile, photos, preferences, and messages are removed. Some records are kept where the law requires it, or where they are needed to keep other members safe — for example a report made by or about you.',
      ],
    },
    {
      heading: 'Payment',
      body: [
        'Halal Mode Premium is an optional paid membership. Prices are shown before you pay.',
        'Premium is a subscription that renews automatically at the end of each period, at the price shown when you subscribed, until you cancel. Cancelling stops the next renewal; Premium continues until the end of the period you paid for.',
        'Payment is handled by the app store you bought it from, and their refund rules apply. You can cancel from your app store account at any time.',
        'Premium changes how many introductions you receive. It does not buy anyone’s attention, and it does not make anyone more likely to choose you.',
      ],
    },
    {
      heading: 'Responsibility',
      body: [
        'We provide Halal Mode with care, but we cannot guarantee it will always be available or free of errors, or that any introduction will lead to marriage.',
        'We are not responsible for what members say or do, inside or outside the app. Nothing in these terms limits a responsibility that the law where you live does not allow us to limit, including for death or personal injury caused by negligence, or for fraud.',
        'If you live in the UK or EU, the consumer laws of your country still protect you, and you may bring a claim in its courts.',
      ],
    },
    {
      heading: 'Law',
      body: [
        'These terms are governed by the laws of the State of New Mexico, USA, except where the law of the country you live in gives you protections that cannot be set aside.',
      ],
    },
    {
      heading: 'Changes',
      body: [
        'If we change these terms in a way that matters, we will ask you to read and accept them again before you continue.',
      ],
    },
    {
      heading: 'Getting in touch',
      body: ['Write to us at hello@halalmo.de and a person will read it.'],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  slug: 'privacy',
  title: 'Privacy Notice',
  updated: LEGAL_VERSION,
  intro:
    'This explains exactly what Halal Mode stores, who can see it, and what is never shown to anyone. It is written to be read, not to be skipped. Halal Mode LLC, 1209 Mountain Road Pl NE, Ste R, Albuquerque, NM 87110, USA, is responsible for your data (the “controller”). Write to hello@halalmo.de about anything here.',
  sections: [
    {
      heading: 'What we store',
      body: [
        'Your email address, so you can sign in.',
        'Your profile: name, date of birth, city and country, what you do, what you have written about yourself, your photographs, and an optional voice introduction.',
        'Your preferences: the age, distance, and other qualities you are looking for, and which of them are must-haves.',
        'Your activity: which introductions you were shown, which you kept, your answers to the questions, and your messages.',
        'Your location, rounded to about one kilometre, with the nearest city and country. It comes from your device, is used only to work out how far apart two people are, and is never shown to anyone.',
        'Your background and faith: your sect or school, how you practise, religious dress, ethnicity, the countries your family are from, and whether you have or want children. Also your height and body type, which are never shown to anyone.',
      ],
    },
    {
      heading: 'Sensitive information, and your consent',
      body: [
        'Your religious beliefs and your ethnicity are sensitive information under data protection law. We use them only with your explicit consent, which you give separately when you join: to show them on your profile, and to make introductions.',
        'You can withdraw that consent at any time by writing to hello@halalmo.de or by closing your account. Introductions depend on this information, so withdrawing it means we can no longer introduce you, and we will close your account at your request.',
      ],
    },
    {
      heading: 'Why we use your information',
      body: [
        'To provide the service you signed up for: your profile, introductions, questions and messages (performing our contract with you).',
        'Your faith and ethnicity: with your explicit consent.',
        'Keeping members safe: checking photographs and bios, handling reports and blocks, and preventing fraud (our legitimate interest in a safe service, and yours).',
        'Understanding how the app is used: counts such as how many people complete a profile, never what anyone wrote, tied to a random device number rather than to you (our legitimate interest in improving the service).',
        'Payment records, and anything else the law requires us to keep (legal obligation).',
      ],
    },
    {
      heading: 'What other members see',
      body: [
        'People you are introduced to see your first name, age, city, occupation, what you have written, your photographs, and your voice introduction if you recorded one.',
        'They never see your email address, your date of birth, your exact location, or your preferences.',
        'They are never told that you were shown their profile and did not choose them.',
      ],
    },
    {
      heading: 'What nobody sees',
      body: [
        'We keep a private score used to decide who to introduce to whom. It is never shown to anyone — including you. It is not a rating of you as a person, and it is not shared.',
        'Your answers are shown to the other person only once they have answered all of their own questions, and theirs to you only once you have answered all of yours.',
        'Blocks, reports and hides are private. The person is not told. If you hide someone, you are hidden from them too.',
        'Your exact location is never kept. It is rounded to about a kilometre before it is stored, and used only to measure distance.',
      ],
    },
    {
      heading: 'Your messages',
      body: [
        'Messages are stored so they are there when you come back, and so they can be shown to you on another device.',
        'We do not read your messages. The exception is a safety investigation after a report, where a small number of trained staff may read what is necessary to make a decision — and nothing more.',
        'Messages are removed when the account is closed.',
      ],
    },
    {
      heading: 'Your photographs',
      body: [
        'Photographs and voice recordings are stored privately. They are never publicly accessible, and are served only to people you are currently introduced to or connected with, through links that expire within minutes.',
        'Once someone has seen a photograph, no app can stop them taking a screenshot. Share only photographs you are comfortable with someone keeping.',
      ],
    },
    {
      heading: 'Halal Mode Bot summary',
      body: [
        'Once you have both answered your questions, Halal Mode Bot may write a short summary of where your answers agree and where they are worth talking about.',
        'To write it, your answers are processed by an AI service provider acting on our behalf. It does not receive your email, photographs or location, and may not keep your answers or use them for anything else, including training.',
        'The summary is a starting point for conversation, not a judgement about compatibility or suitability.',
      ],
    },
    {
      heading: 'Who we share with',
      body: [
        'We do not sell your data. We never have and we will not.',
        'We use suppliers who process data on our instructions and may not use it for anything else: Supabase (database, sign-in and file storage, hosted in London), Cloudflare (website), Resend (email), Expo, Apple and Google (push notifications), Anthropic (Halal Mode Bot summaries), OpenAI (automatic checks of photographs and bios), PostHog (usage counts, hosted in the EU), and Apple and Google (payments).',
        'Halal Mode LLC is based in the United States, and some suppliers process data there. Where data leaves the UK or EU, it is protected by the European Commission’s standard contractual clauses and the UK addendum to them, or by an adequacy decision.',
        'We will share information if the law requires it, or to protect someone from serious harm.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        'You can change or delete anything on your profile at any time.',
        'You can pause your profile, which stops new introductions without deleting anything.',
        'You can close your account. Your profile is hidden at once, and your profile, photographs, preferences, and messages are removed after a short recovery period.',
        'You can ask for a copy of your data, or ask us to correct or delete it, restrict it, or stop using it for a purpose you object to. Write to hello@halalmo.de and we will answer within one month.',
        'If you are unhappy with how we handle your data, you can complain to the data protection authority where you live; in the UK, that is the Information Commissioner’s Office (ico.org.uk).',
      ],
    },
    {
      heading: 'How long we keep things',
      body: [
        'While your account is open, we keep your profile and messages so the service works.',
        'When you close your account, we remove your profile, photographs, preferences and messages after a 30-day recovery period.',
        'Safety reports, and the record of an account removed for breaking the terms, are kept for up to two years so that a removed member cannot simply return. Payment records are kept as long as tax law requires, usually six years.',
        'Waitlist email addresses are deleted when you join, or whenever you ask.',
      ],
    },
    {
      heading: 'Getting in touch',
      body: [
        'Write to hello@halalmo.de with any question about your data, and a person will answer.',
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<'terms' | 'privacy', LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
