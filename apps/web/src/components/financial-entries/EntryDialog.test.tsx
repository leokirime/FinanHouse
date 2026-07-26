import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '../../test-utils.tsx'
import { EntryDialog } from './EntryDialog.tsx'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open && (
        <EntryDialog titleId="dialog-title" title="Diálogo de teste" onClose={() => setOpen(false)}>
          <p>Conteúdo do diálogo</p>
        </EntryDialog>
      )}
    </div>
  )
}

describe('EntryDialog', () => {
  it('expõe papel de diálogo modal com título associado', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialog = screen.getByRole('dialog', { name: 'Diálogo de teste' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('fecha ao pressionar Escape e devolve o foco ao elemento que abriu o diálogo', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('fecha ao clicar no botão de fechar', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('fecha ao clicar fora do conteúdo (backdrop), mas não ao clicar dentro', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    fireEvent.click(screen.getByText('Conteúdo do diálogo'))
    expect(screen.queryByRole('dialog')).toBeTruthy()

    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
