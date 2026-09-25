import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getMovie, getMovieReviews } from '../api/client'
import type { MovieDetail, Person } from '../api/types'
import { useFetch } from '../api/useFetch'
import { Pagination } from '../components/Pagination'
import { ReviewForm } from '../components/ReviewForm'
import {
  formatBRL,
  formatCount,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNota,
} from '../format'

export function MoviePage() {
  const { id = '' } = useParams()
  // A `key` zera o estado (página de reviews etc.) quando troca de filme.
  return <MovieView key={id} id={id} />
}

function MovieView({ id }: { id: string }) {
  const [version, setVersion] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)

  const movie = useFetch(`movie:${id}:${version}`, (s) => getMovie(id, s), { keepPrevious: true })
  const reviews = useFetch(
    `reviews:${id}:${reviewPage}:${version}`,
    (s) => getMovieReviews(id, reviewPage, s),
    { keepPrevious: true },
  )

  function handleReviewCreated() {
    setReviewPage(1)
    setVersion((v) => v + 1)
  }

  if (movie.error) {
    const notFound = movie.error instanceof ApiError && movie.error.status === 404
    return (
      <main className="page">
        <p>
          {notFound
            ? 'Esse filme não está no catálogo.'
            : 'Não foi possível carregar o filme. Confira se o backend está rodando em localhost:8000.'}
        </p>
        <Link to="/">Voltar ao catálogo</Link>
      </main>
    )
  }

  if (!movie.data) {
    return (
      <main className="page">
        <p className="muted">Carregando filme…</p>
      </main>
    )
  }

  const m = movie.data

  return (
    <main>
      <MovieHero movie={m} />

      <div className="page detail">
        <section className="detail__section" aria-labelledby="notas">
          <h2 id="notas">Notas</h2>
          <dl className="scores">
            <Score
              label="Usuários do CineData"
              nota={m.nota_media_usuarios}
              votos={m.qtd_avaliacoes_usuarios}
            />
            <Score label="TMDB" nota={m.performance?.nota_tmdb} votos={m.performance?.qtd_tmdb} />
            <Score label="IMDb" nota={m.performance?.nota_imdb} votos={m.performance?.qtd_imdb} />
          </dl>
        </section>

        {m.sinopse && (
          <section className="detail__section" aria-labelledby="sinopse">
            <h2 id="sinopse">Sinopse</h2>
            <p className="detail__sinopse">{m.sinopse}</p>
          </section>
        )}

        <section className="detail__section" aria-labelledby="ficha">
          <h2 id="ficha">Ficha técnica</h2>
          <dl className="facts">
            <Fact label="Direção" value={names(m.elenco, 'Diretor')} />
            <Fact label="Roteiro" value={names(m.elenco, 'Roteirista')} />
            <Fact label="Elenco" value={names(m.elenco, 'Ator')} />
            <Fact label="Produtoras" value={m.produtoras.join(', ')} />
          </dl>
        </section>

        <BoxOffice movie={m} />

        <section className="detail__section" aria-labelledby="avaliacoes">
          <h2 id="avaliacoes">Avaliações</h2>
          <ReviewForm movieId={id} onCreated={handleReviewCreated} />

          {reviews.data && reviews.data.total === 0 && (
            <p className="muted">Ninguém avaliou esse filme ainda. Seja a primeira pessoa.</p>
          )}

          {reviews.data && reviews.data.items.length > 0 && (
            <>
              <ul className="reviews">
                {reviews.data.items.map((r) => (
                  <li key={r.sk_movie_review_id} className="review">
                    <p className="review__head">
                      <strong>{r.nome}</strong>
                      <span className="review__nota">{formatNota(r.nota)}</span>
                      <time dateTime={r.created_at}>{formatDateTime(r.created_at)}</time>
                    </p>
                    <p className="review__text">{r.comentario}</p>
                  </li>
                ))}
              </ul>
              <Pagination
                page={reviews.data.page}
                totalPages={reviews.data.total_pages}
                onChange={setReviewPage}
              />
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function MovieHero({ movie }: { movie: MovieDetail }) {
  const [posterFailed, setPosterFailed] = useState(false)
  const [backdropFailed, setBackdropFailed] = useState(false)

  const facts = [
    formatDate(movie.data_lancamento) ?? movie.ano_lancamento,
    formatDuration(movie.duracao_minutos),
    movie.status_filme,
  ].filter(Boolean)

  return (
    <header className="hero">
      {movie.url_backdrop && !backdropFailed && (
        <img
          className="hero__backdrop"
          src={movie.url_backdrop}
          alt=""
          onError={() => setBackdropFailed(true)}
        />
      )}
      <div className="hero__content">
        <Link to="/" className="hero__back">
          Voltar ao catálogo
        </Link>
        <div className="hero__grid">
          <div className="hero__poster">
            {movie.url_poster && !posterFailed ? (
              <img
                src={movie.url_poster}
                alt={`Pôster de ${movie.titulo}`}
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <span>{movie.titulo}</span>
            )}
          </div>
          <div>
            <h1 className="hero__title">{movie.titulo}</h1>
            <ul className="hero__facts">
              {facts.map((fact) => (
                <li key={String(fact)}>{fact}</li>
              ))}
            </ul>
            {movie.generos.length > 0 && (
              <ul className="tags">
                {movie.generos.map((g) => (
                  <li key={g}>
                    <Link to={`/?genero=${encodeURIComponent(g)}`}>{g}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function BoxOffice({ movie }: { movie: MovieDetail }) {
  const p = movie.performance
  const orcamento = formatBRL(p?.orcamento_brl)
  const receita = formatBRL(p?.receita_brl)
  if (!orcamento && !receita) return null

  // Lucro só faz sentido quando os dois valores existem.
  const lucro = orcamento && receita ? Number(p!.lucro_brl) : null

  return (
    <section className="detail__section" aria-labelledby="bilheteria">
      <h2 id="bilheteria">Bilheteria</h2>
      <dl className="facts facts--money">
        <Fact label="Orçamento" value={orcamento} />
        <Fact label="Receita" value={receita} />
        {lucro !== null && (
          <Fact
            label={lucro >= 0 ? 'Lucro' : 'Prejuízo'}
            value={formatBRL(String(Math.abs(lucro)))}
          />
        )}
      </dl>
    </section>
  )
}

function Score(props: { label: string; nota?: number | null; votos?: number | null }) {
  return (
    <div className="score">
      <dt>{props.label}</dt>
      <dd>
        <span className="score__value">{formatNota(props.nota)}</span>
        <span className="muted">
          {props.votos
            ? `${formatCount(props.votos)} ${props.votos === 1 ? 'voto' : 'votos'}`
            : 'sem votos'}
        </span>
      </dd>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'Não informado'}</dd>
    </div>
  )
}

function names(people: Person[], tipo: Person['tipo_pessoa']) {
  return people
    .filter((p) => p.tipo_pessoa === tipo)
    .map((p) => p.nome_pessoa)
    .join(', ')
}
