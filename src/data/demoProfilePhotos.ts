import type { ImageSource } from 'expo-image';

export type ProfilePhotoSource = ImageSource | number | string;

// Curated, generated photography for the 32 server-backed demo profiles.
const SERVER_DEMO_PHOTOS: Record<string, readonly ProfilePhotoSource[]> = {
  '8551248e-115b-4a4d-a508-231a2a7e5300': [require('../../assets/demo-profiles/adam-abdullah-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/adam-abdullah-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/adam-abdullah-3.jpg') as ProfilePhotoSource],
  '311947c3-3bb5-4d84-9190-2e2d95255429': [require('../../assets/demo-profiles/aisha-rahman-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/aisha-rahman-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/aisha-rahman-3.jpg') as ProfilePhotoSource],
  'e35cfe95-662f-407e-9f6e-fb76db0678f3': [require('../../assets/demo-profiles/amina-mohamud-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/amina-mohamud-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/amina-mohamud-3.jpg') as ProfilePhotoSource],
  'e58bef05-26c1-4c41-abf8-5134558a165a': [require('../../assets/demo-profiles/amir-idrissi-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/amir-idrissi-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/amir-idrissi-3.jpg') as ProfilePhotoSource],
  '4c18c0ae-1c03-4ef3-9eeb-02ca3e249f38': [require('../../assets/demo-profiles/anas-karim-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/anas-karim-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/anas-karim-3.jpg') as ProfilePhotoSource],
  '3e7091e3-77a7-4a61-a1a3-fea89d03eb04': [require('../../assets/demo-profiles/bilal-malik-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/bilal-malik-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/bilal-malik-3.jpg') as ProfilePhotoSource],
  '81680922-be44-4ab4-8ee6-106ddd6844cc': [require('../../assets/demo-profiles/faisal-farouk-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/faisal-farouk-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/faisal-farouk-3.jpg') as ProfilePhotoSource],
  '647793ec-7e3a-477b-9acb-21dedbeccbb7': [require('../../assets/demo-profiles/fatima-al-sayed-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/fatima-al-sayed-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/fatima-al-sayed-3.jpg') as ProfilePhotoSource],
  '1af28353-2ed4-4d7b-a935-be1c766cf0d8': [require('../../assets/demo-profiles/hafsa-idrissi-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hafsa-idrissi-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hafsa-idrissi-3.jpg') as ProfilePhotoSource],
  '927c7b4f-acaf-4166-b542-85de80985e33': [require('../../assets/demo-profiles/hamza-osman-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hamza-osman-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hamza-osman-3.jpg') as ProfilePhotoSource],
  '5ec5dca0-7eb5-45aa-b80c-78f2e27d2c82': [require('../../assets/demo-profiles/hana-yilmaz-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hana-yilmaz-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hana-yilmaz-3.jpg') as ProfilePhotoSource],
  '3885d831-f148-4af5-900f-21bbcf42ea63': [require('../../assets/demo-profiles/hassan-nasser-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hassan-nasser-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/hassan-nasser-3.jpg') as ProfilePhotoSource],
  'b74bb8ef-6923-4f3a-9af7-6f4877418fbf': [require('../../assets/demo-profiles/ibrahim-hussain-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ibrahim-hussain-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ibrahim-hussain-3.jpg') as ProfilePhotoSource],
  'f717121b-ec74-46f5-96e0-c6ba41ce9425': [require('../../assets/demo-profiles/idris-yilmaz-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/idris-yilmaz-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/idris-yilmaz-3.jpg') as ProfilePhotoSource],
  '03bc6811-b298-4d79-a63f-07ae6e608786': [require('../../assets/demo-profiles/iman-nasser-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/iman-nasser-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/iman-nasser-3.jpg') as ProfilePhotoSource],
  '2668f543-7986-44b3-82b8-2b11148bbdae': [require('../../assets/demo-profiles/ismail-benali-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ismail-benali-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ismail-benali-3.jpg') as ProfilePhotoSource],
  'a5d85362-09f4-460c-8e2c-c4f397f3bf77': [require('../../assets/demo-profiles/khadija-osman-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/khadija-osman-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/khadija-osman-3.jpg') as ProfilePhotoSource],
  'b32a4ffb-9cd6-453c-aa63-828c84c853f1': [require('../../assets/demo-profiles/khalid-mohamud-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/khalid-mohamud-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/khalid-mohamud-3.jpg') as ProfilePhotoSource],
  '8d13940c-9766-4382-b994-25e8b765f1be': [require('../../assets/demo-profiles/layla-benali-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/layla-benali-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/layla-benali-3.jpg') as ProfilePhotoSource],
  '431cbc86-291f-4331-9eae-517f75470e5e': [require('../../assets/demo-profiles/maryam-hussain-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/maryam-hussain-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/maryam-hussain-3.jpg') as ProfilePhotoSource],
  '3929644f-7469-475d-956d-59cb642446d8': [require('../../assets/demo-profiles/musa-chowdhury-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/musa-chowdhury-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/musa-chowdhury-3.jpg') as ProfilePhotoSource],
  'fb7d78d9-fc0a-4af9-95ff-ec4b216905a0': [require('../../assets/demo-profiles/noor-siddiqui-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/noor-siddiqui-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/noor-siddiqui-3.jpg') as ProfilePhotoSource],
  '727e5d2f-1101-4fd6-a9f6-c16e3acf991f': [require('../../assets/demo-profiles/omar-al-sayed-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/omar-al-sayed-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/omar-al-sayed-3.jpg') as ProfilePhotoSource],
  '3c3bdb24-dcc9-4bdb-9b51-ec8e5ad99056': [require('../../assets/demo-profiles/ruqayya-abdullah-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ruqayya-abdullah-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/ruqayya-abdullah-3.jpg') as ProfilePhotoSource],
  '5a30e5c3-b6da-4dc0-9605-00580c369b77': [require('../../assets/demo-profiles/salma-chowdhury-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/salma-chowdhury-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/salma-chowdhury-3.jpg') as ProfilePhotoSource],
  '8fd5bec7-9fee-4982-9ce3-f30f93b42bc7': [require('../../assets/demo-profiles/sara-haddad-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/sara-haddad-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/sara-haddad-3.jpg') as ProfilePhotoSource],
  '4d96ab52-6ba7-42b4-97c3-8bffcdee7fba': [require('../../assets/demo-profiles/sumaya-farouk-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/sumaya-farouk-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/sumaya-farouk-3.jpg') as ProfilePhotoSource],
  '96978529-cf97-4552-b4a1-f29c0a32e8e1': [require('../../assets/demo-profiles/tariq-siddiqui-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/tariq-siddiqui-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/tariq-siddiqui-3.jpg') as ProfilePhotoSource],
  '2c8693b3-2e24-4ca5-b66c-4ad989b313b4': [require('../../assets/demo-profiles/yasmin-karim-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/yasmin-karim-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/yasmin-karim-3.jpg') as ProfilePhotoSource],
  '9f34ae35-2b22-465a-9fbd-687862cf97b6': [require('../../assets/demo-profiles/yusuf-rahman-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/yusuf-rahman-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/yusuf-rahman-3.jpg') as ProfilePhotoSource],
  '5e537b3a-9614-430f-94a9-015c827890c3': [require('../../assets/demo-profiles/zainab-malik-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/zainab-malik-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/zainab-malik-3.jpg') as ProfilePhotoSource],
  'bcab7009-33b9-4459-9ef9-6f75a5ee9387': [require('../../assets/demo-profiles/zakariya-haddad-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/zakariya-haddad-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/zakariya-haddad-3.jpg') as ProfilePhotoSource]
};

// The bundled offline demo stores stable references in Profile.photos. Member
// uploads remain ordinary URLs and never pass through this lookup.
const BUNDLED_DEMO_PHOTOS: Record<string, readonly ProfilePhotoSource[]> = {
  'mock-amina-rahmani': [require('../../assets/demo-profiles/mock-amina-rahmani-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-amina-rahmani-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-amina-rahmani-3.jpg') as ProfilePhotoSource],
  'mock-yasmine-benali': [require('../../assets/demo-profiles/mock-yasmine-benali-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-yasmine-benali-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-yasmine-benali-3.jpg') as ProfilePhotoSource],
  'mock-maryam-el-farouk': [require('../../assets/demo-profiles/mock-maryam-el-farouk-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-maryam-el-farouk-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-maryam-el-farouk-3.jpg') as ProfilePhotoSource],
  'mock-layla-al-hassan': [require('../../assets/demo-profiles/mock-layla-al-hassan-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-layla-al-hassan-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-layla-al-hassan-3.jpg') as ProfilePhotoSource],
  'mock-salma-qureshi': [require('../../assets/demo-profiles/mock-salma-qureshi-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-salma-qureshi-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-salma-qureshi-3.jpg') as ProfilePhotoSource],
  'mock-zainab-mansour': [require('../../assets/demo-profiles/mock-zainab-mansour-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-zainab-mansour-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-zainab-mansour-3.jpg') as ProfilePhotoSource],
  'mock-soraya-kaddouri': [require('../../assets/demo-profiles/mock-soraya-kaddouri-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-soraya-kaddouri-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-soraya-kaddouri-3.jpg') as ProfilePhotoSource],
  'mock-zayd-al-mansoor': [require('../../assets/demo-profiles/mock-zayd-al-mansoor-1.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-zayd-al-mansoor-2.jpg') as ProfilePhotoSource,
    require('../../assets/demo-profiles/mock-zayd-al-mansoor-3.jpg') as ProfilePhotoSource]
};

const DEMO_PHOTO_REFERENCE = /^demo-profile:([a-z0-9-]+):([0-2])$/i;

export function demoPhotoReference(slug: string, index: number): string {
  const photoIndex = ((Math.floor(index) % 3) + 3) % 3;
  return 'demo-profile:' + slug + ':' + photoIndex;
}

/** Keep sample gallery length aligned with the generated set of three photos. */
export function getProfilePhotoGallery(profileId: string, photos: readonly string[]): string[] {
  const generatedSources = SERVER_DEMO_PHOTOS[profileId];
  return generatedSources ? photos.slice(0, generatedSources.length) : [...photos];
}

/**
 * Resolve generated local portraits for sample profiles while leaving member
 * photo URLs untouched. Server demo galleries resolve by profile UUID; bundled
 * mock galleries resolve by their explicit demo-profile reference.
 */
export function getProfilePhotoSource(
  profileId: string,
  photos: readonly string[],
  index = 0
): ProfilePhotoSource {
  const photo = photos[index] ?? '';
  const bundledMatch = DEMO_PHOTO_REFERENCE.exec(photo);

  if (bundledMatch) {
    const slug = bundledMatch[1];
    const sources = slug ? BUNDLED_DEMO_PHOTOS[slug] : undefined;
    const bundledIndex = Number(bundledMatch[2] ?? 0);
    return sources?.[bundledIndex] ?? photo;
  }

  const serverSources = SERVER_DEMO_PHOTOS[profileId];
  if (serverSources?.length) {
    const sourceIndex = ((Math.floor(index) % serverSources.length) + serverSources.length) % serverSources.length;
    return serverSources[sourceIndex] ?? photo;
  }

  return photo;
}
