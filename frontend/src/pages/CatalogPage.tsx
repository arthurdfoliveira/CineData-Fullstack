import { type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { getGenres, getMovies } from '../api/client'
import type { MovieFilters, OrderBy, OrderDir } from '../api/types'
import { useFetch } from '../api/useFetch'
import { MovieCard } from '../components/MovieCard'
import { Pagination } from '../components/Pagination'

const ORDER_OPTIONS: { value: `${OrderBy}:${OrderDir}`; label: string }[] = [
  { value: 'popularidade:desc', label: 'Mais populares' },
  { value: 'nota_tmdb:desc', label: 'Maior nota TMDB' },
  { value: 'ano_lancamento:desc', label: 'Mais recentes' },
  { value: 'ano_lancamento:asc', label: 'Mais antigos' },
  { value: 'titulo:asc', label: 'Título (A–Z)' },
]

const PAGE_SIZE = 24

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso

  const search = params.get('search') ?? ''
  const genero = params.get('genero') ?? ''
  const ano = params.get('ano') ?? ''
  const ordem = params.get('ordem') ?? 'popularidade:desc'
  const page = Number(params.get('page') ?? '1')
  const [orderBy, order] = ordem.split(':') as [OrderBy, OrderDir]

  const filters: MovieFilters = {
    search: search || undefined,
    genero: genero || undefined,
    ano: ano ? Number(ano) : undefined,
    order_by: orderBy,
    order,
    page,
    page_size: PAGE_SIZE,
  }

  const movies = useFetch(JSON.stringify(filters), (signal) => getMovies(filters, signal))
  const genres = useFetch('genres', getGenres)

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    update({
      search: String(form.get('search') ?? '').trim(),
      ano: String(form.get('ano') ?? ''),
    })
  }

  function changePage(next: number) {
    update({ page: next > 1 ? String(next) : '' })
    window.scrollTo({ top: 0 })
  }

  const hasFilters = Boolean(search || genero || ano)

  return (
    <main className="catalog">
      {aviso && (
        <p className="notice" role="status">
          {aviso}
        </p>
      )}

      <form className="filters" onSubmit={handleSubmit} key={`${search}|${ano}`}>
        <label className="filters__search">
          <span>Buscar por título</span>
          <input type="search" name="search" defaultValue={search} placeholder="Ex.: Matrix" />
        </label>

        <label>
          <span>Ano</span>
          <input
            type="number"
            name="ano"
            defaultValue={ano}
            min={1870}
            max={2100}
            inputMode="numeric"
          />
        </label>

        <label>
          <span>Gênero</span>
          <select value={genero} onChange={(e) => update({ genero: e.target.value })}>
            <option value="">Todos</option>
            {genres.data?.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Ordenar por</span>
          <select value={ordem} onChange={(e) => update({ ordem: e.target.value })}>
            {ORDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="button">
          Buscar
        </button>
      </form>

      <div className="catalog__status" aria-live="polite">
        {movies.loading && <p>Carregando filmes…</p>}
        {movies.error && (
          <p className="catalog__error">
            Não foi possível carregar os filmes. Confira se o backend está rodando em
            localhost:8000.
          </p>
        )}
        {movies.data && (
          <p>
            {movies.data.total.toLocaleString('pt-BR')}{' '}
            {movies.data.total === 1 ? 'filme encontrado' : 'filmes encontrados'}
          </p>
        )}
      </div>

      {movies.data && movies.data.items.length === 0 && (
        <div className="catalog__empty">
          <p>Nenhum filme com esses filtros. Tente outro título ou remova algum filtro.</p>
          {hasFilters && (
            <button type="button" className="button" onClick={() => setParams({})}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {movies.data && movies.data.items.length > 0 && (
        <>
          <ul className="grid">
            {movies.data.items.map((movie) => (
              <MovieCard key={movie.id_filme} movie={movie} />
            ))}
          </ul>
          <Pagination
            page={movies.data.page}
            totalPages={movies.data.total_pages}
            onChange={changePage}
          />
        </>
      )}
    </main>
  )
}
