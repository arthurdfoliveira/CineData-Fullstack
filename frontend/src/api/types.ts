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
