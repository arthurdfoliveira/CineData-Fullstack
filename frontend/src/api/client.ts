import type {
  MovieDetail,
  MovieFilters,
  MovieListItem,
  Page,
  Review,
  ReviewInput,
} from './types'

const API_URL = '/api/v1'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) {
    throw new ApiError(response.status, `Erro ${response.status} ao acessar ${path}`)
  }
  return response.json() as Promise<T>
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
  return request<Review>(`/movies/${encodeURIComponent(id)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  })
}
