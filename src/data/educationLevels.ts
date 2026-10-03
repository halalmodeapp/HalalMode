import type { CatalogGroup } from './catalogOption';
import { attachListTranslations } from './translations';

/**
 * How far a member took their education, and in what.
 *
 * Short on purpose. This is a field people scan past on somebody else's
 * profile, so the useful answer is a level, not an institution — "Bachelor's
 * degree" tells a reader what they wanted to know, where "BSc Hons Mechanical
 * Engineering, 2:1" only tells them the writer was proud of it.
 *
 * Religious education sits in its own group rather than being ranked against
 * secular study, because they are not steps on the same ladder and many
 * members here have both.
 */
export const EDUCATION_GROUPS: readonly CatalogGroup[] = [
  {
    id: 'school',
    en: 'School',
    ar: 'التعليم المدرسي',
    options: [
      { id: 'primary_school', en: 'Primary school', ar: 'التعليم الابتدائي' },
      { id: 'secondary_school', en: 'Secondary school', ar: 'التعليم المتوسط' },
      { id: 'high_school', en: 'High school', ar: 'الثانوية العامة' },
      { id: 'homeschooled', en: 'Homeschooled', ar: 'تعليم منزلي' },
    ],
  },
  {
    id: 'further',
    en: 'College & Vocational',
    ar: 'الكليات والتدريب المهني',
    options: [
      { id: 'college_diploma', en: 'College diploma', ar: 'دبلوم كلية' },
      { id: 'vocational_certificate', en: 'Vocational certificate', ar: 'شهادة مهنية' },
      { id: 'apprenticeship', en: 'Apprenticeship', ar: 'تدرّج مهني' },
      { id: 'associate_degree', en: 'Associate degree', ar: 'درجة جامعية متوسطة' },
    ],
  },
  {
    id: 'university',
    en: 'University',
    ar: 'التعليم الجامعي',
    options: [
      { id: 'undergraduate_current', en: 'Currently at university', ar: 'طالب جامعي حالياً' },
      { id: 'bachelors', en: 'Bachelor’s degree', ar: 'بكالوريوس' },
      { id: 'masters', en: 'Master’s degree', ar: 'ماجستير' },
      { id: 'doctorate', en: 'Doctorate / PhD', ar: 'دكتوراه' },
      { id: 'medical_degree', en: 'Medical degree', ar: 'درجة في الطب' },
      { id: 'law_degree', en: 'Law degree', ar: 'درجة في القانون' },
      { id: 'professional_qualification', en: 'Professional qualification', ar: 'مؤهل مهني' },
    ],
  },
  {
    id: 'religious',
    en: 'Religious Education',
    ar: 'التعليم الشرعي',
    options: [
      { id: 'hifz', en: 'Hifz (memorised the Qur’an)', ar: 'حفظ القرآن الكريم' },
      { id: 'partial_hifz', en: 'Partial hifz', ar: 'حفظ جزء من القرآن' },
      { id: 'islamic_studies_diploma', en: 'Islamic studies diploma', ar: 'دبلوم دراسات إسلامية' },
      { id: 'alim_course', en: 'Alim / Alimah course', ar: 'دورة عالِم أو عالِمة' },
      { id: 'islamic_degree', en: 'Degree in Islamic studies', ar: 'درجة في الدراسات الإسلامية' },
    ],
  },
  {
    id: 'other',
    en: 'Other',
    ar: 'أخرى',
    options: [
      { id: 'self_taught', en: 'Self-taught', ar: 'تعليم ذاتي' },
      { id: 'still_studying', en: 'Still studying', ar: 'ما زال يدرس' },
      { id: 'prefer_not_to_say', en: 'Prefer not to say', ar: 'أفضّل عدم الإفصاح' },
    ],
  },
];

attachListTranslations(EDUCATION_GROUPS, 'education');
