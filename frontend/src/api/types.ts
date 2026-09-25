export interface Page<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface MovieListItem {
  id_filme: string
  titulo: string
  ano_lancamento: number | null
  duracao_minutos: number | null
  status_filme: string | null
  url_poster: string | null
  nota_tmdb: number | null
  popularidade: number | null
  nota_media_usuarios: number | null
  qtd_avaliacoes_usuarios: number | null
}

export type OrderBy = 'popularidade' | 'nota_tmdb' | 'ano_lancamento' | 'titulo'
export type OrderDir = 'asc' | 'desc'

export interface MovieFilters {
  search?: string
  genero?: string
  ano?: number
  order_by?: OrderBy
  order?: OrderDir
  page?: number
  page_size?: number
}

export interface Person {
  nome_pessoa: string
  tipo_pessoa: 'Ator' | 'Diretor' | 'Roteirista'
}

/** Valores monetários chegam como texto (Decimal no backend). */
export interface MoviePerformance {
  orcamento_usd: string | null
  receita_usd: string | null
  lucro_usd: string
  orcamento_brl: string | null
  receita_brl: string | null
  lucro_brl: string
  popularidade: number | null
  nota_tmdb: number | null
  qtd_tmdb: number | null
  nota_imdb: number | null
  qtd_imdb: number | null
}

export interface MovieDetail {
  id_filme: string
  titulo: string
  data_lancamento: string | null
  ano_lancamento: number | null
  duracao_minutos: number | null
  status_filme: string | null
  sinopse: string | null
  url_poster: string | null
  url_backdrop: string | null
  generos: string[]
  produtoras: string[]
  elenco: Person[]
  performance: MoviePerformance | null
  nota_media_usuarios: number | null
  qtd_avaliacoes_usuarios: number | null
}

export interface Review {
  sk_movie_review_id: string
  nome: string
  nota: number
  comentario: string
  created_at: string
}

export interface ReviewInput {
  nome: string
  nota: number
  comentario: string
}
