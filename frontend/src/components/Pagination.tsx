interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Paginação">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Anterior
      </button>
      <span>
        Página {page.toLocaleString('pt-BR')} de {totalPages.toLocaleString('pt-BR')}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Próxima
      </button>
    </nav>
  )
}
