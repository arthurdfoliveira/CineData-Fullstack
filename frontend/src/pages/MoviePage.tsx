import { Link, useParams } from 'react-router-dom'

// Página de detalhe: vai ser construída na próxima etapa.
export function MoviePage() {
  const { id } = useParams()

  return (
    <main className="catalog">
      <p>Detalhe do filme {id} ainda em construção.</p>
      <Link to="/">Voltar ao catálogo</Link>
    </main>
  )
}
