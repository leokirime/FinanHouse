import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')

describe('index.html', () => {
  it('declara lang="pt-BR"', () => {
    expect(html).toContain('lang="pt-BR"')
  })

  it('nunca declara lang="en"', () => {
    expect(html).not.toContain('lang="en"')
  })

  it('tem o título "HouseManager"', () => {
    expect(html).toContain('<title>HouseManager</title>')
  })

  it('declara charset UTF-8', () => {
    expect(html).toContain('charset="UTF-8"')
  })
})
