import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Seo } from './Seo'
import equations from './equations.json'
const state = vi.hoisted(() => ({ data: undefined as unknown, isSuccess: false }))
vi.mock('../data/equationManifest', () => ({ useEquationManifest: () => state, resolveEquationManifest: (data: unknown) => data }))
beforeEach(() => { document.head.innerHTML = ''; state.data = undefined; state.isSuccess = false })
afterEach(cleanup)
it('keeps current public lessons indexable without the API and updates metadata after account navigation', () => {
  render(<MemoryRouter initialEntries={['/equation/57']}><Seo /><Link to="/login">Account</Link><Link to="/about">About</Link></MemoryRouter>)
  expect(document.title).toContain(equations.find(e => e.id === 57)!.title)
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large')
  fireEvent.click(screen.getByText('Account'))
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  fireEvent.click(screen.getByText('About'))
  expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://sciencebo.uk/about')
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large')
})
it('does not call an unavailable catalog proof that a page is missing', () => {
  document.head.innerHTML = '<title>Published new equation</title><meta name="robots" content="index, follow">'
  render(<MemoryRouter initialEntries={['/equation/999']}><Seo /></MemoryRouter>)
  expect(document.title).toBe('Published new equation')
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
})
it('excludes genuinely unknown routes after a successful catalog response', () => {
  state.data = equations; state.isSuccess = true
  render(<MemoryRouter initialEntries={['/equation/999']}><Seo /></MemoryRouter>)
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
})
