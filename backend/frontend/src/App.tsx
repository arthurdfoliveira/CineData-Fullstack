import { Link, Route, Routes } from 'react-router-dom'
import { CatalogPage } from './pages/CatalogPage'
import { EditMoviePage, NewMoviePage } from './pages/MovieFormPage'
import { MoviePage } from './pages/MoviePage'

function App() {
  return (
    <>
      <header className="marquee">
        <div>
          <Link to="/" className="marquee__title">
            CineData
          </Link>
          <p className="marquee__tagline">Encontre um filme e diga o que achou.</p>
        </div>
        <Link to="/filmes/novo" className="button marquee__action">
          Cadastrar filme
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/filmes/novo" element={<NewMoviePage />} />
        <Route path="/filmes/:id" element={<MoviePage />} />
        <Route path="/filmes/:id/editar" element={<EditMoviePage />} />
      </Routes>
    </>
  )
}

export default App
