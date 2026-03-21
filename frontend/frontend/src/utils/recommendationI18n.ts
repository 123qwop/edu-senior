import type { TFunction } from 'i18next'

/** Known subject / class labels from DB → i18n keys (class names that match these strings get translated). */
const SUBJECT_OR_CLASS_LABEL_KEYS: Record<string, string> = {
  General: 'recommendations.subjectGeneral',
  Mathematics: 'studySets.subjectMathematics',
  Physics: 'studySets.subjectPhysics',
  Chemistry: 'studySets.subjectChemistry',
  Biology: 'recommendations.subjectBiology',
  English: 'recommendations.subjectEnglish',
  History: 'recommendations.subjectHistory',
  Geography: 'recommendations.subjectGeography',
  'Computer Science': 'recommendations.subjectComputerScience',
  Literature: 'recommendations.subjectLiterature',
}

/**
 * Translate a subject or a class name when it matches a known label.
 * Study set titles should not be passed here — use only for subjects / class names.
 */
export function translateSubjectOrClassName(raw: string | null | undefined, t: TFunction): string {
  if (raw == null || raw === '') return ''
  const key = SUBJECT_OR_CLASS_LABEL_KEYS[raw]
  return key ? t(key) : raw
}

export type RecommendationReasonPayload = {
  reason?: string
  reasonKey?: string | null
  reasonParams?: Record<string, unknown> | null
}

/** Builds localized recommendation copy; keeps {{setTitle}} etc. from API untranslated. */
export function formatRecommendationReason(rec: RecommendationReasonPayload, t: TFunction): string {
  const key = rec.reasonKey
  if (key) {
    const params = rec.reasonParams ?? {}
    if (key === 'recommendations.reasonHighScoreOtherSet') {
      return t(key, {
        setTitle: String(params.setTitle ?? ''),
        topic: translateSubjectOrClassName(String(params.topicRaw ?? ''), t),
      })
    }
    if (key === 'recommendations.reasonNewAssignmentInClass') {
      return t(key, {
        className: translateSubjectOrClassName(String(params.className ?? ''), t),
      })
    }
    const forT: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) forT[k] = v as string | number
    }
    return t(key, forT)
  }
  return rec.reason ?? ''
}

/** Topic chip: translate only when API marks value as a subject, not a study set title. */
export function recommendationTopicChipLabel(
  topic: string | null | undefined,
  topicIsSubject: boolean | undefined,
  t: TFunction,
): string {
  if (topic == null || topic === '') return ''
  if (topicIsSubject === true) return translateSubjectOrClassName(topic, t)
  return topic
}

export function translateDifficulty(d: string | null | undefined, t: TFunction): string {
  if (d == null || d === '') return ''
  if (d === 'Easy') return t('common.difficultyEasy')
  if (d === 'Medium') return t('common.difficultyMedium')
  if (d === 'Hard') return t('common.difficultyHard')
  if (d === 'Beginner') return t('recommendations.difficultyBeginner')
  if (d === 'Advanced') return t('recommendations.difficultyAdvanced')
  return d
}
