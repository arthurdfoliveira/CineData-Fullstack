import { useNavigate } from 'react-router-dom'
import { createMovie } from '../api/client'
import type { MovieInput } from '../api/types'
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
