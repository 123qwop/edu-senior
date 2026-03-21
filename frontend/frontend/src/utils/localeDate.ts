/** Map i18n language code to `Intl` / `toLocaleDateString` locale tag. */
export function dateLocaleForI18n(lng: string): string {
  if (lng === 'kz' || lng.startsWith('kk')) return 'kk-KZ'
  if (lng === 'ru' || lng.startsWith('ru')) return 'ru-RU'
  return 'en-US'
}

export function formatShortLocaleDate(
  dateString: string | null | undefined,
  lng: string,
  neverLabel: string,
): string {
  if (!dateString) return neverLabel
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(dateLocaleForI18n(lng), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return neverLabel
  }
}
