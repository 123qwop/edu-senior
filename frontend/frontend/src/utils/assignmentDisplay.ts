/** Format API due ISO strings for student-facing UI (date + local time). */

export function localeTagForI18n(lng: string): string {
  if (lng === 'kz' || lng.startsWith('kk')) return 'kk-KZ'
  if (lng === 'ru' || lng.startsWith('ru')) return 'ru-RU'
  return 'en-US'
}

export function formatDueDateTime(iso: string | null | undefined, i18nLanguage: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(localeTagForI18n(i18nLanguage), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** True if due moment is strictly before now (for emphasis, not legal enforcement). */
export function isDuePast(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}
