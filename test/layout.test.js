import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return styles.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 's'))?.[1] || ''
}

test('the ocean board has eight explicitly constrained rows and columns', () => {
  const board = ruleFor('.board')
  assert.match(board, /grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(board, /grid-template-rows:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(board, /aspect-ratio:\s*1/)
})

test('cell and piece contents cannot change a board track size', () => {
  const cell = ruleFor('.water-cell')
  const piece = ruleFor('.piece')
  const image = ruleFor('.piece img')

  assert.match(cell, /width:\s*100%/)
  assert.match(cell, /height:\s*100%/)
  assert.match(cell, /contain:\s*layout/)
  assert.match(piece, /contain:\s*layout/)
  assert.match(image, /max-height:\s*100%/)
  assert.match(image, /object-fit:\s*contain/)
})
