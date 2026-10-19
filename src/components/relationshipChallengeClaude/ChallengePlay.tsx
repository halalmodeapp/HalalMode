import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PlayCard, ProgressLine, Waiting } from '@/components/halalCards/CardParts';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { LTR_LAYOUT, LTR_WEB_PROPS } from '@/lib/rtl';
import type { Seat } from '@/halalCards/types';
import { deriveRc, privateClueFor, rcOtherSeat, rcProgress, type RcView } from '@/halalCards/relationshipChallengeClaude/engine';
import { DESTINATIONS } from '@/halalCards/relationshipChallengeClaude/scenarios';
import { rcCopy, rcText, type RcCopyKey } from '@/halalCards/relationshipChallengeClaude/strings';
import {
  RC_EMOTES,
  type RcAction,
  type RcClaudeState,
  type RcClue,
  type RcDestination,
  type RcHotspot,
  type RcMotif,
  type RcScenario,
} from '@/halalCards/relationshipChallengeClaude/types';
import { alpha, color, font, layout, radius, space } from '@/theme/tokens';
import { rcClaudeAssets } from './assetSource';
import { LengthGlyph, MoonGlyph, SettingGlyph, SunGlyph } from './Glyphs';
import { RoomStage } from './RoomStage';

/**
 * The challenge itself, the same surface for a real two-phone session and
 * the local preview. It only reads the shared log and sends actions; the
 * engine decides what they mean.
 */

export interface RcPlayModel {
  scenario: RcScenario;
  state: RcClaudeState;
  mySeat: Seat;
  partnerName: string;
  dispatch: (action: RcAction) => void;
  /** A write is on its way. Taps still work; actions queue. */
  pending: boolean;
  /** The last refresh failed; progress is safe and will resume. */
  reconnecting: boolean;
  onExit: () => void;
  /** Local preview only: the seat switch above the room. */
  preview?: { onSeat: (seat: Seat) => void; onReset: () => void };
}

function useCopy() {
  const { language } = useI18n();
  return useMemo(
    () => ({
      t: (key: RcCopyKey, params?: Record<string, string | number>) => rcCopy(language, key, params),
      text: (key: string, params?: Record<string, string | number>) => rcText(language, key, params),
    }),
    [language]
  );
}

function MotifRow({ motifs, size = 34, counts }: { motifs: RcMotif[]; size?: number; counts?: number[] }) {
  // Authored order: never mirrored for right-to-left layouts.
  return (
    <View style={styles.ltrRow} {...LTR_WEB_PROPS}>
      {motifs.map((motif, i) => (
        <View key={`${motif}-${i}`} style={styles.motifCell}>
          {Array.from({ length: counts?.[i] ?? 1 }, (_, n) => (
            <Image key={n} source={rcClaudeAssets.resolve(`rc_claude_token_${motif}`)} style={{ width: size, height: size }} contentFit="contain" />
          ))}
        </View>
      ))}
    </View>
  );
}

function DestinationCard({
  destination,
  selected,
  onPress,
  compact,
}: {
  destination: RcDestination;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { t, text } = useCopy();
  const row = (kind: 'sun' | 'moon') => {
    const values = destination[kind];
    return (
      <View style={styles.cardRow} accessible accessibilityLabel={`${t(kind === 'sun' ? 'row.sun' : 'row.moon')}: ${t(`setting.${values.setting}`)}, ${t(`length.${values.length}`)}`}>
        {kind === 'sun' ? <SunGlyph size={16} /> : <MoonGlyph size={16} />}
        <SettingGlyph setting={values.setting} size={18} />
        <Text style={styles.cardRowText}>{t(`setting.${values.setting}`)}</Text>
        <LengthGlyph length={values.length} size={18} />
        <Text style={styles.cardRowText}>{t(`length.${values.length}`)}</Text>
      </View>
    );
  };
  const body = (
    <View style={[styles.destCard, compact && styles.destCardCompact, selected && styles.destCardSelected]}>
      <Image source={rcClaudeAssets.resolve(destination.artAssetId)} style={styles.destArt} contentFit="cover" />
      <Text variant="label">{text(destination.titleKey)}</Text>
      {row('sun')}
      {row('moon')}
      {selected ? <Text variant="microAccent">{t('card.chosen')}</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} style={styles.destPress}>
      {body}
    </Pressable>
  );
}

function ClueBody({ clue }: { clue: RcClue }) {
  const { text } = useCopy();
  return (
    <View style={styles.clueBody}>
      {clue.kind === 'motif' ? <MotifRow motifs={[clue.motif]} counts={[clue.count]} size={40} /> : null}
      {clue.kind === 'mark' ? (
        <View style={styles.ltrRow}>
          <MoonGlyph size={36} />
        </View>
      ) : null}
      {clue.kind === 'cards' ? (
        <View style={styles.cardGrid}>
          {DESTINATIONS.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} compact />
          ))}
        </View>
      ) : null}
      <Text variant="body">{text(clue.textKey)}</Text>
    </View>
  );
}

function Dial({ value, index, onStep }: { value: number; index: number; onStep: (delta: 1 | -1) => void }) {
  const { t } = useCopy();
  return (
    <View style={styles.dial} accessible={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('final.slot', { index: index + 1 })} ${t('final.up')}`} onPress={() => onStep(1)} style={styles.dialButton}>
        <Text style={styles.dialArrow}>▲</Text>
      </Pressable>
      <Text style={styles.dialDigit} accessibilityLabel={`${t('final.slot', { index: index + 1 })}: ${value}`}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('final.slot', { index: index + 1 })} ${t('final.down')}`} onPress={() => onStep(-1)} style={styles.dialButton}>
        <Text style={styles.dialArrow}>▼</Text>
      </Pressable>
    </View>
  );
}

function FinalPanel({ model, view }: { model: RcPlayModel; view: RcView }) {
  const { t, text } = useCopy();
  const { scenario, mySeat, partnerName } = model;
  const proposal = view.proposal;
  const [digits, setDigits] = useState<number[]>(() =>
    proposal && scenario.answer.kind === 'symbol_sequence' ? proposal.value.split('').map(Number) : [0, 0, 0]
  );
  const [choice, setChoice] = useState<string | null>(proposal && scenario.answer.kind === 'constraint_choice' ? proposal.value : null);
  const [editing, setEditing] = useState(false);
  // The last agreed answer did not fit; say so gently until a new one is put forward.
  const missed = view.misses.length > 0;

  if (!view.ready) {
    return <Text variant="body">{t('final.notReady')}</Text>;
  }

  const finalKey = scenario.scenarioId === 'three_things_we_noticed' ? 'a.final' : 'b.final';
  const theirs = proposal && proposal.by !== mySeat && !proposal.agreed.includes(mySeat);
  const mine = proposal && proposal.agreed.includes(mySeat) && proposal.agreed.length === 1;
  const value = scenario.answer.kind === 'symbol_sequence' ? digits.join('') : (choice ?? '');
  const showProposal = proposal && !editing;
  const display = (raw: string) =>
    scenario.answer.kind === 'symbol_sequence'
      ? raw.split('').join(' · ')
      : text(DESTINATIONS.find((destination) => destination.id === raw)?.titleKey ?? raw);

  return (
    <View style={styles.finalPanel}>
      <Text variant="body">{text(finalKey)}</Text>
      {missed && !proposal ? <Text variant="bodySmall" style={styles.gentle}>{t('final.miss')}</Text> : null}

      {showProposal ? (
        <View style={styles.proposal} accessibilityLiveRegion="polite">
          <Text variant="microAccent">{theirs ? t('final.theyProposed', { name: partnerName }) : t('final.waitingAgree', { name: partnerName })}</Text>
          <Text variant="displaySmall" style={styles.ltrText}>{display(proposal.value)}</Text>
          {theirs ? (
            <Button label={t('final.agree', { name: partnerName })} onPress={() => model.dispatch({ type: 'confirm', value: proposal.value })} />
          ) : null}
          <Button label={t('final.change')} variant="quiet" onPress={() => setEditing(true)} />
          {mine ? <Waiting label={t('final.waitingAgree', { name: partnerName })} /> : null}
        </View>
      ) : (
        <>
          {scenario.answer.kind === 'symbol_sequence' ? (
            <View style={styles.ltrRow} {...LTR_WEB_PROPS}>
              {digits.map((digit, i) => (
                <Dial
                  key={i}
                  index={i}
                  value={digit}
                  onStep={(delta) => setDigits((current) => current.map((d, j) => (j === i ? (d + delta + 10) % 10 : d)))}
                />
              ))}
            </View>
          ) : (
            <View style={styles.cardGrid}>
              {DESTINATIONS.map((destination) => (
                <DestinationCard key={destination.id} destination={destination} selected={choice === destination.id} onPress={() => setChoice(destination.id)} />
              ))}
            </View>
          )}
          <Button
            label={t('final.propose')}
            disabled={!value}
            onPress={() => {
              setEditing(false);
              if (proposal?.value === value) {
                if (!proposal.agreed.includes(mySeat)) model.dispatch({ type: 'confirm', value });
              } else model.dispatch({ type: 'propose', value });
            }}
          />
        </>
      )}
    </View>
  );
}

function partnerLine(model: RcPlayModel, t: ReturnType<typeof useCopy>['t'], text: ReturnType<typeof useCopy>['text'], thing: (id: string) => string): string | null {
  const partner = rcOtherSeat(model.mySeat);
  const event = [...model.state.log].reverse().find((item) => item.seat === partner);
  if (!event) return null;
  const name = model.partnerName;
  switch (event.type) {
    case 'inspect':
      return t('looking', { name, thing: thing(event.hotspotId) });
    case 'collect': {
      const spot = model.scenario.hotspots.find((hotspot) => hotspot.clueId === event.clueId);
      return spot ? t('found', { who: name, thing: thing(spot.id) }) : null;
    }
    case 'ping':
      return t('pinged', { name, thing: thing(event.hotspotId) });
    case 'emote':
      return t('emote.from', { name, emote: t(`emote.${event.emote}`) });
    case 'hint':
      return t('hintTaken', { name });
    case 'propose':
      return t('final.theyProposed', { name });
    default:
      return null;
  }
}

export function ChallengePlay({ model }: { model: RcPlayModel }) {
  const { t, text } = useCopy();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { scenario, state, mySeat, partnerName } = model;
  const view = useMemo(() => deriveRc(scenario, state), [scenario, state]);
  const [focused, setFocused] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reflection, setReflection] = useState<'open' | 'closed'>('open');
  const seenLength = useRef(state.log.length);

  const thing = (hotspotId: string) => {
    const spot = scenario.hotspots.find((hotspot) => hotspot.id === hotspotId);
    return spot ? text(spot.labelKey) : hotspotId;
  };

  // Tell this player what the other just did, once, for a few seconds.
  useEffect(() => {
    if (state.log.length <= seenLength.current) return;
    const fresh = state.log.slice(seenLength.current);
    seenLength.current = state.log.length;
    if (!fresh.some((event) => event.seat !== mySeat)) return;
    const line = partnerLine(model, t, text, thing);
    if (!line) return;
    setToast(line);
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.log.length]);

  // Switching seats in the preview should not leave the other seat's panel open.
  useEffect(() => {
    seenLength.current = state.log.length;
    setFocused(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySeat]);

  // The screen column's width, capped so the whole room stays in view on a short screen.
  const columnWidth = Math.min(windowWidth, layout.maxContentWidth) - space.gutter * 2;
  const roomWidth = Math.max(240, Math.min(columnWidth, (windowHeight * 0.62) / 1.5));
  const focusedSpot = scenario.hotspots.find((hotspot) => hotspot.id === focused) ?? null;
  const focusedClue = focusedSpot && focusedSpot.clueId !== 'final' ? scenario.clues.find((clue) => clue.id === focusedSpot.clueId) : undefined;
  const privateClue = privateClueFor(scenario, mySeat);
  const myPing = view.pings[mySeat];

  const openHotspot = (hotspot: RcHotspot) => {
    setFocused(hotspot.id);
    if (!view.discovered.includes(hotspot.id)) model.dispatch({ type: 'inspect', hotspotId: hotspot.id });
  };

  const boardClues = scenario.clues.filter((clue) => view.collected.includes(clue.id));

  return (
    <View style={styles.wrap}>
      {model.preview ? (
        <View style={styles.previewBar}>
          <Text variant="micro">{t('preview.as')}</Text>
          {(['host', 'guest'] as Seat[]).map((seat) => (
            <Pressable
              key={seat}
              accessibilityRole="button"
              accessibilityState={{ selected: seat === mySeat }}
              onPress={() => model.preview?.onSeat(seat)}
              style={[styles.seatChip, seat === mySeat && styles.seatChipOn]}
            >
              <Text style={[styles.seatChipText, seat === mySeat && styles.seatChipTextOn]}>{t(seat === 'host' ? 'preview.host' : 'preview.guest')}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={model.preview.onReset} style={styles.seatChip}>
            <Text style={styles.seatChipText}>{t('preview.reset')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.head}>
        <Text variant="microAccent" center>{text(scenario.goalKey)}</Text>
        <ProgressLine value={rcProgress(scenario, view)} />
      </View>

      {model.reconnecting ? (
        <Text variant="caption" center accessibilityLiveRegion="polite">{t('reconnecting')}</Text>
      ) : null}

      <View style={styles.stageWrap}>
        <RoomStage
          scenario={scenario}
          state={state}
          view={view}
          mySeat={mySeat}
          partnerName={partnerName}
          youLabel={t('you')}
          width={roomWidth}
          reducedMotion={reducedMotion}
          focused={focused}
          spotLabel={(hotspot) =>
            `${text(hotspot.labelKey)}, ${view.discovered.includes(hotspot.id) ? t('spot.explored') : t('spot.unexplored')}`
          }
          onHotspot={openHotspot}
          showPlaceholderLabels={__DEV__}
          placeholderLabel={text(scenario.titleKey)}
        />
        {toast ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}
      </View>

      {focusedSpot && !view.solved ? (
        <PlayCard dealKey={`spot-${focusedSpot.id}`}>
          <View style={styles.panelHead}>
            <Text variant="displaySmall">{text(focusedSpot.labelKey).replace(/^./, (c) => c.toUpperCase())}</Text>
            <Pressable accessibilityRole="button" onPress={() => setFocused(null)} hitSlop={10} style={styles.close}>
              <Text style={styles.closeText}>{t('inspect.close')}</Text>
            </Pressable>
          </View>
          {focusedClue ? <ClueBody clue={focusedClue} /> : <FinalPanel model={model} view={view} key={view.proposal?.value ?? 'none'} />}
          <View style={styles.actions}>
            {focusedClue ? (
              view.collected.includes(focusedClue.id) ? (
                <Text variant="microAccent">{t('inspect.collected')}</Text>
              ) : (
                <Button label={t('inspect.collect')} onPress={() => model.dispatch({ type: 'collect', clueId: focusedClue.id })} />
              )
            ) : null}
            <Button
              label={myPing?.hotspotId === focusedSpot.id ? t('inspect.shown') : t('inspect.showPartner', { name: partnerName })}
              variant="secondary"
              disabled={myPing?.hotspotId === focusedSpot.id && view.lastBySeat[mySeat]?.at === myPing.at}
              onPress={() => model.dispatch({ type: 'ping', hotspotId: focusedSpot.id })}
            />
          </View>
        </PlayCard>
      ) : null}

      {view.solved ? (
        <PlayCard dealKey="solved">
          <Text variant="microAccent">{t('solved.title')}</Text>
          <Text variant="display">{text(scenario.titleKey)}</Text>
          <Text variant="body">{text(scenario.completionTextKey)}</Text>
          {reflection === 'open' ? (
            <View style={styles.reflect}>
              <Text variant="label">{t('reflect.title')}</Text>
              <Text variant="quote">{text(scenario.reflectionKey)}</Text>
              <Text variant="caption">{t('reflect.note')}</Text>
              <View style={styles.actions}>
                <Button label={t('reflect.done')} onPress={() => setReflection('closed')} />
                <Button label={t('reflect.skip')} variant="quiet" onPress={() => setReflection('closed')} />
              </View>
            </View>
          ) : (
            <View style={styles.reflect}>
              <Text variant="label">{t('done.title')}</Text>
              <Text variant="bodySmall">{t('done.body')}</Text>
              <Button label={t('back')} onPress={model.onExit} />
            </View>
          )}
        </PlayCard>
      ) : null}

      {!view.solved ? (
        <View style={styles.emotes}>
          {RC_EMOTES.map((emote) => {
            const mine = view.emotes[mySeat]?.emote === emote && view.lastBySeat[mySeat]?.at === view.emotes[mySeat]?.at;
            return (
              <Pressable
                key={emote}
                accessibilityRole="button"
                onPress={() => model.dispatch({ type: 'emote', emote })}
                style={[styles.emote, mine && styles.emoteOn]}
              >
                <Text style={[styles.emoteText, mine && styles.emoteTextOn]}>{t(`emote.${emote}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {privateClue && !view.solved ? (
        <PlayCard dealKey={`private-${mySeat}`}>
          <Text variant="microAccent">{t('yourClue')}</Text>
          {privateClue.motifs ? <MotifRow motifs={privateClue.motifs} size={40} /> : null}
          <Text variant="body">{text(privateClue.textKey)}</Text>
          <Text variant="caption">{t('yourClueNote', { name: partnerName })}</Text>
        </PlayCard>
      ) : null}

      <View style={styles.section}>
        <Text variant="micro">{t('board')}</Text>
        {boardClues.length === 0 ? <Text variant="bodySmall">{t('boardEmpty')}</Text> : null}
        {boardClues.map((clue) =>
          clue.kind === 'cards' ? (
            <View key={clue.id} style={styles.cardGrid}>
              {DESTINATIONS.map((destination) => (
                <DestinationCard key={destination.id} destination={destination} compact />
              ))}
            </View>
          ) : (
            <View key={clue.id} style={styles.boardRow}>
              {clue.kind === 'motif' ? <MotifRow motifs={[clue.motif]} counts={[clue.count]} size={22} /> : <MoonGlyph size={22} />}
              <Text variant="bodySmall" style={styles.flex}>{text(clue.textKey)}</Text>
            </View>
          )
        )}
      </View>

      {!view.solved ? (
        <View style={styles.section}>
          <Text variant="micro">{t('hint.title')}</Text>
          {view.hintLevel === 0 ? <Text variant="bodySmall">{t('hint.none')}</Text> : null}
          {scenario.hints.slice(0, view.hintLevel).map((key, i) => (
            <View key={key} style={styles.hint}>
              <Text variant="microAccent">{t(`hint.level.${(i + 1) as 1 | 2 | 3}`)}</Text>
              <Text variant="bodySmall">{text(key)}</Text>
            </View>
          ))}
          {view.hintLevel < 3 ? (
            <Button
              label={view.hintLevel === 0 ? t('hint') : t('hint.more')}
              variant="secondary"
              onPress={() => model.dispatch({ type: 'hint', level: (view.hintLevel + 1) as 1 | 2 | 3 })}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  flex: { flex: 1 },
  head: { gap: space.sm },
  stageWrap: { alignItems: 'center' },
  previewBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, justifyContent: 'center' },
  seatChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: alpha.lineButton,
    justifyContent: 'center',
  },
  seatChipOn: { backgroundColor: color.ink, borderColor: color.ink },
  seatChipText: { fontFamily: font.bodySemi, fontSize: 13, color: color.ink },
  seatChipTextOn: { color: color.white },
  toast: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,10,10,0.82)',
  },
  toastText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.white, textAlign: 'center' },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontFamily: font.bodySemi, fontSize: 13, color: color.muted },
  actions: { gap: space.sm },
  clueBody: { gap: space.md },
  ltrRow: { ...LTR_LAYOUT, flexDirection: 'row', gap: space.md, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  ltrText: { writingDirection: 'ltr', textAlign: 'center' },
  motifCell: { ...LTR_LAYOUT, flexDirection: 'row', gap: 2, alignItems: 'center' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  destPress: { borderRadius: radius.md },
  destCard: {
    width: 150,
    padding: space.sm,
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: '#F3E6CF',
    borderWidth: 2,
    borderColor: '#2E4E9E',
  },
  destCardCompact: { width: 140 },
  destCardSelected: { borderColor: color.halalPink, borderWidth: 3 },
  destArt: { width: '100%', aspectRatio: 3 / 2, borderRadius: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  cardRowText: { fontFamily: font.body, fontSize: 11, color: color.inkSoft },
  finalPanel: { gap: space.md },
  gentle: { color: color.halalPinkDeep },
  proposal: { gap: space.sm, alignItems: 'center' },
  dial: { alignItems: 'center', gap: 2, padding: space.xs, borderRadius: radius.md, backgroundColor: color.sand },
  dialButton: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dialArrow: { fontSize: 16, color: color.ink },
  dialDigit: { fontFamily: font.display, fontSize: 34, color: color.ink, minWidth: 40, textAlign: 'center' },
  reflect: { gap: space.sm, marginTop: space.sm },
  emotes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  emote: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.sand,
    justifyContent: 'center',
  },
  emoteOn: { backgroundColor: color.halalPinkWash },
  emoteText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.inkSoft },
  emoteTextOn: { color: color.halalPinkDeep },
  section: { gap: space.sm },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hint: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: color.sand },
});
