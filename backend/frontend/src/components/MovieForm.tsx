import { type FormEvent, useState } from 'react'
import { ApiError, getGenres } from '../api/client'
import type { MovieInput } from '../api/types'
import { useFetch } from '../api/useFetch'

interface Props {
  initial?: MovieInput
  submitLabel: string
  onSubmit: (movie: MovieInput) => Promise<void>
  onCancel: () => void
}

const EMPTY: MovieInput = {
  titulo: '',
  diretor: null,
  ano_lancamento: null,
  generos: [],
  sinopse: null,
  duracao_minutos: null,
  url_poster: null,
}

function toNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? Number(text) : null
}

function toText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

export function MovieForm({ initial = EMPTY, submitLabel, onSubmit, onCancel }: Props) {
  const genres = useFetch('genres', getGenres)
  const [selected, setSelected] = useState<string[]>(initial.generos)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGenre(nome: string) {
    setSelected((atual) =>
      atual.includes(nome) ? atual.filter((g) => g !== nome) : [...atual, nome],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSending(true)
    setError(null)

    try {
      await onSubmit({
        titulo: String(form.get('titulo') ?? '').trim(),
        diretor: toText(form.get('diretor')),
        ano_lancamento: toNumber(form.get('ano_lancamento')),
        generos: selected,
        sinopse: toText(form.get('sinopse')),
        duracao_minutos: toNumber(form.get('duracao_minutos')),
        url_poster: toText(form.get('url_poster')),
      })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 422
          ? (err.detail ?? 'Confira os campos: o título é obrigatório e o link do pôster precisa começar com http.')
          : 'Não foi possível salvar agora. Confira se o backend está rodando e tente de novo.',
      )
      setSending(false)
    }
  }

  return (
    <form className="movie-form" onSubmit={handleSubmit}>
      <label className="movie-form__wide">
        <span>Título *</span>
        <input name="titulo" defaultValue={initial.titulo} maxLength={500} required />
      </label>

      <label>
        <span>Direção</span>
        <input
          name="diretor"
          defaultValue={initial.diretor ?? ''}
          maxLength={1000}
          placeholder="Se for mais de um, separe por vírgula"
        />
      </label>

      <div className="movie-form__pair">
        <label>
          <span>Ano de lançamento</span>
          <input
            name="ano_lancamento"
            type="number"
            min={1870}
            max={2100}
            defaultValue={initial.ano_lancamento ?? ''}
            inputMode="numeric"
          />
        </label>
        <label>
          <span>Duração (min)</span>
          <input
            name="duracao_minutos"
            type="number"
            min={1}
            max={1000}
            defaultValue={initial.duracao_minutos ?? ''}
            inputMode="numeric"
          />
        </label>
      </div>

      <fieldset className="movie-form__wide genre-picker">
        <legend>Gêneros</legend>
        {genres.data ? (
          <div className="genre-picker__options">
            {genres.data.map((nome) => (
              <label key={nome} className="genre-picker__option">
                <input
                  type="checkbox"
                  checked={selected.includes(nome)}
                  onChange={() => toggleGenre(nome)}
                />
                <span>{nome}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted">Carregando gêneros…</p>
        )}
      </fieldset>

      <label className="movie-form__wide">
        <span>Sinopse</span>
        <textarea name="sinopse" defaultValue={initial.sinopse ?? ''} maxLength={4000} rows={5} />
      </label>

      <label className="movie-form__wide">
        <span>Link do pôster (opcional)</span>
        <input
          name="url_poster"
          type="url"
          defaultValue={initial.url_poster ?? ''}
          placeholder="https://…"
        />
      </label>

      <div className="movie-form__wide movie-form__footer">
        <button type="submit" className="button" disabled={sending}>
          {sending ? 'Salvando…' : submitLabel}
        </button>
        <button type="button" className="button-ghost" onClick={onCancel} disabled={sending}>
          Cancelar
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
