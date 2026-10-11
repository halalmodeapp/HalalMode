import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceOption, LessonChip, PlayCard, RevealTile, Waiting } from '@/components/halalCards/CardParts';
import { GuideSuggestions } from '@/components/halalCards/GuideSaveButton';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { currentLabStep, labAgreement } from '@/halalCards/engine/lab';
import { answersBySeat, otherSeat } from '@/halalCards/engine/seats';
import { advanceCursor } from '@/halalCards/engine/session';
import type { LabLesson, LabState, LabStep } from '@/halalCards/types';
import { color, radius, space } from '@/theme/tokens';
import { SurfaceToneProvider } from '@/theme/tone';
import type { PlayProps } from './types';

const AGREEMENT = {
  same: 'sameChoice',
  both_help: 'bothHelp',
  split: 'split',
  both_struggle: 'bothStruggle',
} as const;

export function LabPlay({ session, activity, turn, partnerName, connectionId, onAnswer, onAdvance, busy }: PlayProps<LabLesson>) {
  const copy = useCardsCopy();
  const state = session.state as LabState;
  const step = currentLabStep(activity, state.cursor);
  const next = () => onAdvance(advanceCursor(activity, state));

  if (!step) {
    const suggestions = activity.steps.flatMap((item) => (item.type === 'discussion' ? item.guide ?? [] : []));
    return (
      <PlayCard tone="gold" dealKey="done">
        <Illustration image={activity.cover} aspectRatio={16 / 10}>
          <OverlayText kind="eyebrow">{activity.ruleLabel}</OverlayText>
          <OverlayText kind="titleLarge">{copy('lessonDone')}</OverlayText>
        </Illustration>
        <Text variant="body">{copy('lessonDoneBody')}</Text>
        <GuideSuggestions connectionId={connectionId} suggestions={suggestions} source={activity.title} partnerName={partnerName} />
      </PlayCard>
    );
  }

  const isLast = state.cursor === activity.steps.length - 1;
  const scenarioNumber = activity.steps.slice(0, state.cursor + 1).filter((item) => item.type === 'scenario').length;

  switch (step.type) {
    case 'intro':
    case 'insight':
      return (
        <PlayCard tone={step.type === 'insight' ? 'gold' : 'light'} dealKey={step.id}>
          {step.type === 'intro' ? (
            <Illustration image={activity.cover} aspectRatio={4 / 5}>
              <OverlayText kind="eyebrow">{`${activity.ruleLabel} · ${activity.title}`}</OverlayText>
              <OverlayText kind="titleLarge">{step.title}</OverlayText>
            </Illustration>
          ) : (
            <>
              <Text variant="microAccent">{copy('insight')}</Text>
              <Text variant="display">{step.title}</Text>
            </>
          )}
          <Text variant="body">{step.body}</Text>
          {step.type === 'insight' && step.points ? (
            <View style={styles.points}>
              {step.points.map((point) => (
                <LessonChip key={point} tag={activity.ruleLabel} text={point} />
              ))}
            </View>
          ) : null}
          <Button label={copy('next')} onPress={next} loading={busy} />
        </PlayCard>
      );

    case 'discussion':
      return (
        <PlayCard tone="dark" dealKey={step.id}>
          <Text variant="microAccent">{copy('talk')}</Text>
          <Text variant="display">{step.prompt}</Text>
          {step.followUps?.length ? (
            <View style={styles.points}>
              <Text variant="micro">{copy('followUps')}</Text>
              {step.followUps.map((followUp) => (
                <Text key={followUp} variant="body">• {followUp}</Text>
              ))}
            </View>
          ) : null}
          {step.guide?.length ? (
            <SurfaceToneProvider tone="light">
              <View style={styles.guide}>
                <GuideSuggestions connectionId={connectionId} suggestions={step.guide} source={activity.title} partnerName={partnerName} />
              </View>
            </SurfaceToneProvider>
          ) : null}
          <Button label={isLast ? copy('finish') : copy('next')} variant="onDark" onPress={next} loading={busy} />
        </PlayCard>
      );

    case 'scenario':
      return (
        <Scenario
          key={step.id}
          step={step}
          number={scenarioNumber}
          activity={activity}
          session={session}
          turn={turn}
          partnerName={partnerName}
          onAnswer={onAnswer}
          onNext={next}
          busy={busy}
        />
      );
  }
}

function Scenario({
  step,
  number,
  activity,
  session,
  turn,
  partnerName,
  onAnswer,
  onNext,
  busy,
}: Pick<PlayProps<LabLesson>, 'activity' | 'session' | 'turn' | 'partnerName' | 'onAnswer' | 'busy'> & {
  step: Extract<LabStep, { type: 'scenario' }>;
  number: number;
  onNext: () => void;
}) {
  const copy = useCardsCopy();
  const [selected, setSelected] = useState<string | null>(null);
  const key = `l:${step.id}`;
  const picks = answersBySeat<string>(session, key);
  const mine = picks[session.mySeat];
  const theirs = picks[otherSeat(session.mySeat)];
  const choice = (id: string | undefined) => step.choices.find((item) => item.id === id);

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={step.id}>
        {step.image ? (
          <Illustration image={step.image} aspectRatio={16 / 10}>
            <OverlayText kind="eyebrow">{`${activity.ruleLabel} · ${number}`}</OverlayText>
            <OverlayText kind="title">{step.title}</OverlayText>
          </Illustration>
        ) : (
          <>
            <Text variant="microAccent">{`${activity.ruleLabel} · ${number}`}</Text>
            <Text variant="displaySmall">{step.title}</Text>
          </>
        )}
        <Text variant="body">{step.body}</Text>
        <Text variant="quote">{step.prompt}</Text>

        {turn?.kind === 'answer' ? (
          <>
            <View style={styles.choices}>
              {step.choices.map((item, index) => (
                <ChoiceOption
                  key={item.id}
                  index={index}
                  label={item.label}
                  selected={selected === item.id}
                  onPress={() => setSelected(item.id)}
                />
              ))}
            </View>
            <Text variant="caption" center>{copy('privateNote')}</Text>
            <Button
              label={copy('lockIn')}
              disabled={!selected}
              loading={busy}
              onPress={() => selected && onAnswer(key, selected)}
            />
          </>
        ) : null}

        {turn?.kind === 'waiting' ? (
          <>
            <ChoiceOption index={step.choices.findIndex((item) => item.id === mine)} label={choice(mine)?.label ?? ''} selected disabled />
            <Waiting label={copy('waitingFor', { name: partnerName })} />
          </>
        ) : null}
      </PlayCard>

      {turn?.kind === 'reveal' && mine && theirs ? (
        <PlayCard tone="gold" dealKey={`${step.id}-reveal`}>
          <Text variant="microAccent">
            {copy(
              AGREEMENT[
                labAgreement(activity, step.id, session.mySeat === 'host' ? { host: mine, guest: theirs } : { host: theirs, guest: mine })
              ]
            )}
          </Text>
          <View style={styles.tiles}>
            {[
              { who: copy('you'), id: mine },
              { who: partnerName, id: theirs },
            ].map((item, index) => {
              const picked = choice(item.id);
              return picked ? (
                <RevealTile
                  key={item.who}
                  index={index}
                  who={item.who}
                  answer={picked.label}
                  detail={picked.consequence}
                  badge={copy(`tone.${picked.tone}`)}
                />
              ) : null;
            })}
          </View>
          <Button label={copy('next')} onPress={onNext} loading={busy} />
        </PlayCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  points: { gap: space.sm },
  guide: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg },
  choices: { gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
