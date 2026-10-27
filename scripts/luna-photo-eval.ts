/**
 * Checks how Luna judges photos, before a model change goes live.
 *
 *   OPENAI_API_KEY=... deno run -A scripts/luna-photo-eval.ts [model] [folder]
 *
 * The folder (default eval/photos) holds labelled pictures, none of which are
 * kept in the repository:
 *
 *   photos/real/            real camera photos of people       -> allow
 *   photos/screen/          a photo of a screen showing a face  -> remove
 *   photos/print/           a photo of a printed picture        -> remove
 *   photos/illustration/    cartoons, renders, AI images        -> remove
 *   selfies/real/           live selfies, one face              -> allow
 *   selfies/screen/         a selfie of a screen or a print     -> remove
 *
 * It uses the same instructions and rules as the moderate function, prints
 * what each picture got, and the share that came out as expected.
 */
import OpenAI from 'npm:openai';
import {
  PHOTO_INSTRUCTIONS,
  PHOTO_SCHEMA,
  SELFIE_INSTRUCTIONS,
  SELFIE_SCHEMA,
  decidePhoto,
  decideSelfie,
  parsePhotoReading,
  parseSelfieReading,
} from '../supabase/functions/_shared/photoVerdict.ts';
import { FALLBACK_MODEL } from '../supabase/functions/_shared/luna.ts';

const model = Deno.args[0] ?? FALLBACK_MODEL;
const root = Deno.args[1] ?? 'eval';
const openai = new OpenAI();

const CASES: { dir: string; kind: 'photo' | 'selfie'; expect: 'allow' | 'remove' }[] = [
  { dir: 'photos/real', kind: 'photo', expect: 'allow' },
  { dir: 'photos/screen', kind: 'photo', expect: 'remove' },
  { dir: 'photos/print', kind: 'photo', expect: 'remove' },
  { dir: 'photos/illustration', kind: 'photo', expect: 'remove' },
  { dir: 'selfies/real', kind: 'selfie', expect: 'allow' },
  { dir: 'selfies/screen', kind: 'selfie', expect: 'remove' },
];

function dataUrl(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

let total = 0;
let agreed = 0;
for (const { dir, kind, expect } of CASES) {
  let files: Deno.DirEntry[] = [];
  try {
    files = [...Deno.readDirSync(`${root}/${dir}`)].filter((f) => f.isFile && /\.(jpe?g|png|webp)$/i.test(f.name));
  } catch {
    console.log(`${dir}: no folder, skipped`);
    continue;
  }
  for (const file of files) {
    const image = dataUrl(Deno.readFileSync(`${root}/${dir}/${file.name}`));
    const selfie = kind === 'selfie';
    const response = await openai.responses.create({
      model,
      instructions: selfie ? SELFIE_INSTRUCTIONS : PHOTO_INSTRUCTIONS,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: selfie ? 'Read this selfie.' : 'Read this profile photo.' },
        { type: 'input_image', image_url: image, detail: 'high' },
      ] }] as never,
      max_output_tokens: 200,
      text: { format: { type: 'json_schema', name: 'reading', strict: true, schema: (selfie ? SELFIE_SCHEMA : PHOTO_SCHEMA) as never } },
    });
    const text = response.output_text ?? '';
    const verdict = selfie ? decideSelfie(parseSelfieReading(text)) : decidePhoto(parsePhotoReading(text));
    const ok = verdict.decision === expect;
    total += 1;
    if (ok) agreed += 1;
    console.log(`${ok ? 'ok  ' : 'MISS'} ${dir}/${file.name}: ${verdict.decision} (${verdict.reason})`);
  }
}
console.log(`\n${model}: ${agreed} of ${total} as expected${total ? ` (${Math.round((100 * agreed) / total)}%)` : ''}`);
if (total === 0) console.log(`Add pictures under ${root}/ first (see the top of this file).`);
Deno.exit(total > 0 && agreed < total ? 1 : 0);
