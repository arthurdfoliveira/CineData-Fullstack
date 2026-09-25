import type { MovieFilters, MovieListItem, Page } from './types'

const API_URL = '/api/v1'

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal })
  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao acessar ${path}`)
  }
  return response.json() as Promise<T>
}

export function getMovies(filters: MovieFilters, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return getJson<Page<MovieListItem>>(`/movies?${params}`, signal)
}

export function getGenres(signal?: AbortSignal) {
  return getJson<string[]>('/genres', signal)
}
