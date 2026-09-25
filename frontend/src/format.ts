export function formatNota(nota: number | null | undefined) {
  return nota === null || nota === undefined ? '–' : nota.toFixed(1).replace('.', ',')
}

export function formatCount(value: number | null | undefined) {
  return (value ?? 0).toLocaleString('pt-BR')
}

export function formatBRL(value: string | null | undefined) {
  if (value === null || value === undefined) return null
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatDate(isoDate: string | null) {
  if (!isoDate) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { dateStyle: 'long' })
}

export function formatDateTime(isoDateTime: string) {
  // O SQLite devolve a data sem fuso; ela foi gravada em UTC.
  const utc = isoDateTime.endsWith('Z') ? isoDateTime : `${isoDateTime}Z`
  return new Date(utc).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
}

export function formatDuration(minutes: number | null) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}
