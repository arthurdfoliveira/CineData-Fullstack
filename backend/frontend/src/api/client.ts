import type {
  MovieDetail,
  MovieFilters,
  MovieInput,
  MovieListItem,
  Page,
  Review,
  ReviewInput,
} from './types'

const API_URL = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  /** Mensagem de erro que o backend mandou em `detail`, quando é texto. */
  readonly detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : undefined
    throw new ApiError(response.status, `Erro ${response.status} ao acessar ${path}`, detail)
  }
  return response.json() as Promise<T>
}

function sendJson<T>(method: 'POST' | 'PUT', path: string, body: unknown) {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function getMovies(filters: MovieFilters, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return request<Page<MovieListItem>>(`/movies?${params}`, { signal })
}

export function getGenres(signal?: AbortSignal) {
  return request<string[]>('/genres', { signal })
}

export function getMovie(id: string, signal?: AbortSignal) {
  return request<MovieDetail>(`/movies/${encodeURIComponent(id)}`, { signal })
}

export function getMovieReviews(id: string, page: number, signal?: AbortSignal) {
  return request<Page<Review>>(
    `/movies/${encodeURIComponent(id)}/reviews?page=${page}&page_size=10`,
    { signal },
  )
}

export function createReview(id: string, review: ReviewInput) {
  return sendJson<Review>('POST', `/movies/${encodeURIComponent(id)}/reviews`, review)
}

export function createMovie(movie: MovieInput) {
  return sendJson<MovieDetail>('POST', '/movies', movie)
}

export function updateMovie(id: string, movie: MovieInput) {
  return sendJson<MovieDetail>('PUT', `/movies/${encodeURIComponent(id)}`, movie)
}
