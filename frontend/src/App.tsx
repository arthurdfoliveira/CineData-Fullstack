import { Link, Route, Routes } from 'react-router-dom'
import { CatalogPage } from './pages/CatalogPage'
import { MoviePage } from './pages/MoviePage'

function App() {
  return (
    <>
      <header className="marquee">
        <Link to="/" className="marquee__title">
          CineData
        </Link>
        <p className="marquee__tagline">Encontre um filme e diga o que achou.</p>
      </header>

      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/filmes/:id" element={<MoviePage />} />
      </Routes>
    </>
  )
}

export default App
