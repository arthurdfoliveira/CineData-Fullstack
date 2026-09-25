import { useEffect, useState } from 'react'

interface FetchState<T> {
  key: string
  data?: T
  error?: Error
}

/**
 * Busca dados sempre que `key` muda e cancela a requisição anterior.
 * `loading` fica true enquanto o resultado guardado não é o da chave atual.
 */
export function useFetch<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<FetchState<T>>({ key: '' })

  useEffect(() => {
    const controller = new AbortController()

    fetcher(controller.signal)
      .then((data) => setState({ key, data }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ key, error })
      })

    return () => controller.abort()
    // `fetcher` é recriado a cada render; a chave já representa tudo que muda a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const isCurrent = state.key === key
  return {
    data: isCurrent ? state.data : undefined,
    error: isCurrent ? state.error : undefined,
    loading: !isCurrent,
  }
}
