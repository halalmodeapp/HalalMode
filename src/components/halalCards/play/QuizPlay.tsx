import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ChoiceOption, Pill, PlayCard, RevealTile, Waiting } from '@/components/halalCards/CardParts';
import { GuideSuggestions } from '@/components/halalCards/GuideSaveButton';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import {
  answerComplete,
  knowMeSubject,
  personalise,
  quizKey,
  quizNeeds,
  revealCard,
  scoreQuiz,
} from '@/halalCards/engine/quiz';
import { answersBySeat, bothAnswered, otherSeat } from '@/halalCards/engine/seats';
import { advanceCursor } from '@/halalCards/engine/session';
import type { Quiz, QuizAnswer, QuizCard, QuizState, Seat } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { alpha, color, font, space } from '@/theme/tokens';
import type { PlayProps } from './types';

export function QuizPlay(props: PlayProps<Quiz>) {
  const { session, activity, partnerName, connectionId, onAdvance, busy } = props;
  const copy = useCardsCopy();
  const state = session.state as QuizState;
  const card = activity.cards[state.cursor];

  if (!card) {
    const score = scoreQuiz(
      activity,
      activity.cards.map((item) => {
        const answers = answersBySeat<QuizAnswer>(session, quizKey(item));
        return bothAnswered(answers) ? answers : undefined;
      })
    );
    const me = session.mySeat;
    return (
      <PlayCard tone="gold" dealKey="done">
        <Illustration image={activity.cover} aspectRatio={16 / 10}>
          <OverlayText kind="eyebrow">{activity.title}</OverlayText>
          <OverlayText kind="titleLarge">{copy('quizDone')}</OverlayText>
        </Illustration>
        {score.compared ? (
          <Text variant="quote">
            {copy('quizScoreSame', { agreed: score.agreed, total: score.compared })}
            {score.close ? ` ${copy('quizScoreClose', { count: score.close })}` : ''}
          </Text>
        ) : null}
        {(['host', 'guest'] as Seat[]).map((seat) =>
          score.guesses[seat].total ? (
            <Text key={seat} variant="body">
              {copy('quizScoreGuesses', {
                name: seat === me ? copy('you') : partnerName,
                right: score.guesses[seat].right,
                total: score.guesses[seat].total,
              })}
            </Text>
          ) : null
        )}
        <GuideSuggestions connectionId={connectionId} suggestions={activity.guide ?? []} source={activity.title} partnerName={partnerName} />
      </PlayCard>
    );
  }

  return (
    <QuizCardView
      key={card.id}
      {...props}
      card={card}
      index={state.cursor}
      onNext={() => onAdvance(advanceCursor(activity, state))}
      busy={busy}
    />
  );
}

function QuizCardView({
  session,
  activity,
  turn,
  partnerName,
  onAnswer,
  card,
  index,
  onNext,
  busy,
}: PlayProps<Quiz> & { card: QuizCard; index: number; onNext: () => void }) {
  const copy = useCardsCopy();
  const me = session.mySeat;
  const needs = quizNeeds(activity, index, me);
  const [draft, setDraft] = useState<QuizAnswer>({});
  const key = quizKey(card);
  const options = activity.format === 'more_likely' ? [copy('me'), copy('myPartner')] : card.options;
  const answers = answersBySeat<QuizAnswer>(session, key);

  const header =
    activity.format === 'know_me'
      ? knowMeSubject(index) === me
        ? copy('youAnswerTheyGuess', { name: partnerName })
        : copy('theyAnswerYouGuess', { name: partnerName })
      : `${index + 1} / ${activity.cards.length}`;

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={card.id}>
        {index === 0 ? (
          <Illustration image={activity.cover} aspectRatio={16 / 10}>
            <OverlayText kind="eyebrow">{copy(`format.${activity.format}`)}</OverlayText>
            <OverlayText kind="title">{activity.title}</OverlayText>
          </Illustration>
        ) : null}
        <Text variant="microAccent">{header}</Text>
        {turn?.kind === 'answer' ? (
          <>
            {needs.self ? (
              <View style={styles.block}>
                {needs.guess ? <Text variant="micro">{copy('aboutYou')}</Text> : null}
                <Text variant="displaySmall">{card.prompt}</Text>
                <View style={styles.choices}>
                  {options.map((option, optionIndex) => (
                    <ChoiceOption
                      key={option}
                      index={optionIndex}
                      label={option}
                      selected={draft.self === optionIndex}
                      onPress={() => setDraft((current) => ({ ...current, self: optionIndex }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {needs.guess ? (
              <View style={styles.block}>
                {needs.self ? <Text variant="micro">{copy('yourGuess', { name: partnerName })}</Text> : null}
                <Text variant="displaySmall">{personalise(card.guessPrompt ?? card.prompt, partnerName)}</Text>
                <View style={styles.choices}>
                  {options.map((option, optionIndex) => (
                    <ChoiceOption
                      key={option}
                      index={optionIndex}
                      label={option}
                      selected={draft.guess === optionIndex}
                      onPress={() => setDraft((current) => ({ ...current, guess: optionIndex }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <Text variant="caption" center>{copy('privateNote')}</Text>
            <Button
              label={copy('lockIn')}
              disabled={!answerComplete(needs, draft)}
              loading={busy}
              onPress={() => onAnswer(key, draft)}
            />
          </>
        ) : (
          <Text variant="displaySmall">
            {activity.format === 'know_me' && knowMeSubject(index) !== me
              ? personalise(card.guessPrompt ?? card.prompt, partnerName)
              : card.prompt}
          </Text>
        )}
        {turn?.kind === 'waiting' ? <Waiting label={copy('waitingFor', { name: partnerName })} /> : null}
      </PlayCard>

      {turn?.kind === 'reveal' && bothAnswered(answers) ? (
        <PlayCard tone="gold" dealKey={`${card.id}-reveal`}>
          <Reveal quiz={activity} card={card} index={index} answers={answers} me={me} partnerName={partnerName} options={options} />
          {card.talk ? <Text variant="quote">{card.talk}</Text> : null}
          <Button label={index === activity.cards.length - 1 ? copy('finish') : copy('next')} onPress={onNext} loading={busy} />
        </PlayCard>
      ) : null}
    </View>
  );
}

function Reveal({
  quiz,
  card,
  index,
  answers,
  me,
  partnerName,
  options,
}: {
  quiz: Quiz;
  card: QuizCard;
  index: number;
  answers: Record<Seat, QuizAnswer>;
  me: Seat;
  partnerName: string;
  options: string[];
}) {
  const copy = useCardsCopy();
  const reducedMotion = useReducedMotion();
  const reveal = revealCard(quiz, index, answers);
  const them = otherSeat(me);
  const nameOf = (seat: Seat) => (seat === me ? copy('you') : partnerName);
  const option = (value: number | undefined) => (value === undefined ? '—' : options[value] ?? '—');
  const verdict = (agreed: boolean | null, distance?: number) =>
    agreed === null ? null : agreed ? copy('samePage') : distance === 1 ? copy('close') : distance ? copy('apart', { count: distance }) : copy('different');

  const banner = (label: string | null, gold: boolean) =>
    label ? (
      <Animated.View entering={reducedMotion ? undefined : ZoomIn.delay(600).springify()}>
        <Pill label={label} tone={gold ? 'gold' : 'quiet'} />
      </Animated.View>
    ) : null;

  switch (quiz.format) {
    case 'know_me': {
      const subject = knowMeSubject(index);
      const guesser = otherSeat(subject);
      const right = reveal.guessedRight[guesser];
      return (
        <View style={styles.tiles}>
          <RevealTile index={0} who={`${nameOf(subject)} · ${copy('said')}`} answer={option(answers[subject].self)} />
          <RevealTile
            index={1}
            who={`${nameOf(guesser)} · ${copy('guessed')}`}
            answer={option(answers[guesser].guess)}
            badge={right ? `✓ ${copy('guessedRight')}` : copy('guessedWrong')}
          />
        </View>
      );
    }
    case 'guess_my_answer':
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile
                key={seat}
                index={tileIndex}
                who={nameOf(seat)}
                answer={option(answers[seat].self)}
                detail={`${nameOf(otherSeat(seat))} ${copy('guessed')}: ${option(answers[otherSeat(seat)].guess)}`}
                badge={reveal.guessedRight[otherSeat(seat)] ? `✓ ${copy('guessedRight')}` : copy('guessedWrong')}
              />
            ))}
          </View>
        </View>
      );
    case 'more_likely':
      return (
        <View style={styles.block}>
          {banner(reveal.agreed ? copy('agreeWho') : copy('disagreeWho'), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile
                key={seat}
                index={tileIndex}
                who={`${nameOf(seat)} · ${copy('pointedAt')}`}
                answer={reveal.pointed ? nameOf(reveal.pointed[seat]) : '—'}
              />
            ))}
          </View>
        </View>
      );
    case 'scale':
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed, reveal.distance), !!reveal.agreed)}
          <View style={styles.scale}>
            {card.options.map((label, optionIndex) => {
              const mine = answers[me].self === optionIndex;
              const theirs = answers[them].self === optionIndex;
              return (
                <View key={label} style={styles.scaleStop}>
                  <View style={[styles.scaleDot, (mine || theirs) && styles.scaleDotOn, mine && theirs && styles.scaleDotBoth]} />
                  <Text style={[styles.scaleLabel, (mine || theirs) && styles.scaleLabelOn]} numberOfLines={3}>{label}</Text>
                  {mine || theirs ? (
                    <Text style={styles.scaleWho}>{[mine ? copy('you') : null, theirs ? partnerName : null].filter(Boolean).join(' & ')}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      );
    default:
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile key={seat} index={tileIndex} who={nameOf(seat)} answer={option(answers[seat].self)} />
            ))}
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  block: { gap: space.md },
  choices: { gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  scale: { flexDirection: 'row', gap: 4, borderTopWidth: 1, borderTopColor: alpha.line, paddingTop: space.md },
  scaleStop: { flex: 1, alignItems: 'center', gap: 6 },
  scaleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: alpha.lineStrong, marginTop: -19 },
  scaleDotOn: { backgroundColor: color.goldGlow, width: 16, height: 16, borderRadius: 8, marginTop: -21 },
  scaleDotBoth: { backgroundColor: color.ink },
  scaleLabel: { fontFamily: font.body, fontSize: 10.5, lineHeight: 14, color: color.faint, textAlign: 'center' },
  scaleLabelOn: { color: color.ink, fontFamily: font.bodySemi },
  scaleWho: { fontFamily: font.bodySemi, fontSize: 10, color: color.gold, textAlign: 'center' },
});
