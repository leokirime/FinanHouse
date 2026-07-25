import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sem isto, o DOM de um `render()` permanece entre testes do mesmo arquivo
// (o autocleanup do Testing Library depende de um `afterEach` global, que só
// existe com `test.globals: true` — não é o caso aqui), fazendo com que
// consultas como `getByText` encontrem elementos duplicados de renders
// anteriores.
afterEach(() => {
  cleanup()
})
