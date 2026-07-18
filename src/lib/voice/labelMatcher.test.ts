import { describe, expect, it } from 'vitest'
import { findMatchingLabels } from './labelMatcher'
import type { GmailLabel } from '@/lib/gmail/labels'

function label(id: string, name: string): GmailLabel {
  return { id, name }
}

describe('findMatchingLabels', () => {
  const labels = [
    label('1', 'Receipts'),
    label('2', 'Work Stuff'),
    label('3', 'Unsubscribe'),
    label('4', 'Taxes 2024'),
  ]

  it('returns an empty array for empty spoken input', () => {
    expect(findMatchingLabels('', labels)).toEqual([])
    expect(findMatchingLabels('   ', labels)).toEqual([])
  })

  it('matches exact label names case-insensitively', () => {
    expect(findMatchingLabels('receipts', labels)).toEqual([labels[0]])
    expect(findMatchingLabels('UNSUBSCRIBE', labels)).toEqual([labels[2]])
  })

  it('matches ignoring punctuation/spacing differences', () => {
    expect(findMatchingLabels('work stuff', labels)).toEqual([labels[1]])
  })

  it('falls back to substring matching when no exact match exists', () => {
    expect(findMatchingLabels('taxes', labels)).toEqual([labels[3]])
  })

  it('returns multiple matches when ambiguous', () => {
    const ambiguous = [label('5', 'Work Travel'), label('6', 'Work Life')]
    expect(findMatchingLabels('work', ambiguous)).toEqual(ambiguous)
  })

  it('returns an empty array when nothing matches', () => {
    expect(findMatchingLabels('groceries', labels)).toEqual([])
  })
})
