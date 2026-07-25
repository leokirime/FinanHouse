import { useEffect, useRef, type ReactNode } from 'react'
import './EntryDialog.css'

export interface EntryDialogProps {
  titleId: string
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Casca de diálogo reutilizada por criação/edição/realização/cancelamento.
 * Usa `<dialog open>` (semântica nativa) sem `showModal()` — o navegador
 * (e o jsdom, nos testes) já expõe o papel de diálogo corretamente via
 * `aria-modal`, e evitamos depender da API imperativa de `HTMLDialogElement`
 * ainda incompleta em alguns ambientes de teste. Foco inicial fica a cargo
 * do primeiro campo de cada formulário (`autoFocus`); o foco retorna ao
 * elemento que abriu o diálogo quando ele fecha.
 */
export function EntryDialog({ titleId, title, onClose, children }: EntryDialogProps) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    return () => {
      previouslyFocusedRef.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fh-entry-dialog__backdrop" onClick={onClose}>
      <dialog
        open
        aria-labelledby={titleId}
        aria-modal="true"
        className="fh-entry-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fh-entry-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="fh-entry-dialog__close" onClick={onClose} aria-label="Fechar">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </dialog>
    </div>
  )
}
