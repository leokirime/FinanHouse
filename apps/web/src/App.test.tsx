import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Finanhouse name and slogan', () => {
    render(<App />)
    expect(screen.getByText('Finanhouse')).toBeTruthy()
    expect(screen.getByText('Casa, evolução e equilíbrio')).toBeTruthy()
  })
})
