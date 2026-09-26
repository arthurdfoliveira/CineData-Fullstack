import { Link, useNavigate, useParams } from 'react-router-dom'
import { createMovie, getMovie, updateMovie } from '../api/client'
import type { MovieDetail, MovieInput } from '../api/types'
import { useFetch } from '../api/useFetch'
import { MovieForm } from '../components/MovieForm'

export function NewMoviePage() {
  const navigate = useNavigate()

  async function handleCreate(movie: MovieInput) {
    const created = await createMovie(movie)
    navigate(`/filmes/${created.id_filme}`)
  }

  return (
    <main className="page form-page">
      <h1 className="form-page__title">Cadastrar filme</h1>
      <MovieForm
        submitLabel="Cadastrar filme"
        onSubmit={handleCreate}
        onCancel={() => navigate('/')}
      />
    </main>
  )
}

export function EditMoviePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const movie = useFetch(`movie:${id}`, (s) => getMovie(id, s))

  async function handleUpdate(input: MovieInput) {
    await updateMovie(id, input)
    navigate(`/filmes/${id}`)
  }

  if (movie.error) {
    return (
      <main className="page">
        <p>Não foi possível carregar esse filme para edição.</p>
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

  return (
    <main className="page form-page">
      <h1 className="form-page__title">Editar {movie.data.titulo}</h1>
      <MovieForm
        initial={toInput(movie.data)}
        submitLabel="Salvar alterações"
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/filmes/${id}`)}
      />
    </main>
  )
}

function toInput(movie: MovieDetail): MovieInput {
  const diretores = movie.elenco
    .filter((p) => p.tipo_pessoa === 'Diretor')
    .map((p) => p.nome_pessoa)
  return {
    titulo: movie.titulo,
    diretor: diretores.join(', ') || null,
    ano_lancamento: movie.ano_lancamento,
    generos: movie.generos,
    sinopse: movie.sinopse,
    duracao_minutos: movie.duracao_minutos,
    url_poster: movie.url_poster,
  }
}
