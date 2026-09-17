import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { EquationUnavailable } from './EquationUnavailable'
it('retains the public lesson information during catalog failure and provides retry', () => {
  const retry = vi.fn()
  render(<EquationUnavailable id={57} retry={retry} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cobb-Douglas Production')
  expect(screen.queryByText(/does not exist/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry lesson' }))
  expect(retry).toHaveBeenCalledOnce()
})
