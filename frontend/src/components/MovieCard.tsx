import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MovieListItem } from '../api/types'

function formatNota(nota: number | null) {
  return nota === null ? '–' : nota.toFixed(1).replace('.', ',')
}

export function MovieCard({ movie }: { movie: MovieListItem }) {
  const [posterFailed, setPosterFailed] = useState(false)
  const showPoster = movie.url_poster && !posterFailed

  return (
    <li className="movie">
      <Link to={`/filmes/${movie.id_filme}`} className="movie__link">
        <div className="movie__poster">
          {showPoster ? (
            <img
              src={movie.url_poster!}
              alt=""
              loading="lazy"
              onError={() => setPosterFailed(true)}
            />
          ) : (
            <span className="movie__no-poster">{movie.titulo}</span>
          )}
        </div>
        <h2 className="movie__title">{movie.titulo}</h2>
      </Link>
      <p className="movie__year">{movie.ano_lancamento ?? 'Ano desconhecido'}</p>
      <dl className="movie__scores">
        <div>
          <dt>TMDB</dt>
          <dd>{formatNota(movie.nota_tmdb)}</dd>
        </div>
        <div>
          <dt>Usuários</dt>
          <dd>
            {formatNota(movie.nota_media_usuarios)}
            {movie.qtd_avaliacoes_usuarios ? (
              <small> ({movie.qtd_avaliacoes_usuarios})</small>
            ) : null}
          </dd>
        </div>
      </dl>
    </li>
  )
}
