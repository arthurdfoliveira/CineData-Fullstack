import { type FormEvent, useState } from 'react'
import { ApiError, createReview } from '../api/client'

interface Props {
  movieId: string
  onCreated: () => void
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string }

export function ReviewForm({ movieId, onCreated }: Props) {
  const [nome, setNome] = useState('')
  const [nota, setNota] = useState('')
  const [comentario, setComentario] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'sending' })

    try {
      await createReview(movieId, {
        nome: nome.trim(),
        nota: Number(nota.replace(',', '.')),
        comentario: comentario.trim(),
      })
      setNota('')
      setComentario('')
      setStatus({ kind: 'done' })
      onCreated()
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 422
          ? 'Confira os campos: a nota vai de 0 a 10 e nome e comentário não podem ficar vazios.'
          : 'Não foi possível publicar agora. Confira se o backend está rodando e tente de novo.'
      setStatus({ kind: 'error', message })
    }
  }

  const sending = status.kind === 'sending'

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-form__row">
        <label>
          <span>Seu nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            required
            autoComplete="name"
          />
        </label>
        <label className="review-form__nota">
          <span>Nota (0 a 10)</span>
          <input
            type="number"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            min={0}
            max={10}
            step={0.5}
            required
            inputMode="decimal"
          />
        </label>
      </div>

      <label>
        <span>Comentário</span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={4000}
          rows={4}
          required
        />
      </label>

      <div className="review-form__footer">
        <button type="submit" className="button" disabled={sending}>
          {sending ? 'Publicando…' : 'Publicar avaliação'}
        </button>
        <p aria-live="polite" className={status.kind === 'error' ? 'form-error' : 'form-ok'}>
          {status.kind === 'done' && 'Avaliação publicada.'}
          {status.kind === 'error' && status.message}
        </p>
      </div>
    </form>
  )
}
