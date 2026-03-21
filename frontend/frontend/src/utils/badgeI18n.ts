import type { TFunction } from 'i18next'

/** Must match backend `badge_id` values */
export const BADGE_IDS = [
  'consistency',
  'quick_learner',
  'week_warrior',
  'quiz_master',
  'point_collector',
  'perfectionist',
] as const

export type BadgeId = (typeof BADGE_IDS)[number]

export function isBadgeId(id: string | undefined): id is BadgeId {
  return !!id && (BADGE_IDS as readonly string[]).includes(id)
}

export function translateBadgeName(t: TFunction, badgeId: string | undefined, fallbackName: string): string {
  if (badgeId && isBadgeId(badgeId)) {
    return t(`badges.${badgeId}.name`)
  }
  return fallbackName
}

type I18nParams = Record<string, number | string> | undefined

/** Earned badge subtitle on Gamification page */
export function translateGamificationEarnedDescription(
  t: TFunction,
  badgeId: string | undefined,
  fallback: string,
  i18nParams: I18nParams
): string {
  if (!badgeId || !isBadgeId(badgeId)) return fallback
  return t(`badges.${badgeId}.earnedDesc`, { ...(i18nParams ?? {}) })
}

/** Available (locked) badge subtitle */
export function translateGamificationAvailableDescription(
  t: TFunction,
  badgeId: string | undefined,
  fallback: string,
  target: number
): string {
  if (!badgeId || !isBadgeId(badgeId)) return fallback
  return t(`badges.${badgeId}.availableDesc`, { target })
}
