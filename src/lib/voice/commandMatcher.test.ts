import { describe, expect, it } from 'vitest'
import { matchCommand } from './commandMatcher'

describe('matchCommand', () => {
  it('returns null for empty or whitespace-only transcripts', () => {
    expect(matchCommand('')).toBeNull()
    expect(matchCommand('   ')).toBeNull()
  })

  it('matches fixed command phrases case-insensitively', () => {
    expect(matchCommand('Skip')).toMatchObject({
      command: 'skip',
      phrase: 'skip',
    })
    expect(matchCommand('ARCHIVE this one')).toMatchObject({
      command: 'archive',
    })
    expect(matchCommand('please continue')).toMatchObject({
      command: 'continue',
    })
  })

  it('matches synonyms for the same command', () => {
    expect(matchCommand('next')).toMatchObject({ command: 'skip' })
    expect(matchCommand('keep reading')).toMatchObject({ command: 'continue' })
    expect(matchCommand('try again')).toMatchObject({ command: 'redo' })
  })

  it('does not match a phrase as a substring of another word', () => {
    // "redo" should not match inside "redouble", etc. — word-boundary check
    expect(matchCommand('redouble')).toBeNull()
  })

  it('extracts the folder name for "move to X" style triggers', () => {
    expect(matchCommand('move it to Receipts')).toEqual({
      command: 'move',
      phrase: 'move it to receipts',
      argument: 'receipts',
    })
  })

  it('extracts the folder name for "sort into X" style triggers', () => {
    expect(matchCommand('sort into Work Stuff')).toMatchObject({
      command: 'move',
      argument: 'work stuff',
    })
  })

  it('extracts the folder name for "file under X" style triggers', () => {
    expect(matchCommand('file it under Taxes')).toMatchObject({
      command: 'move',
      argument: 'taxes',
    })
  })

  it('extracts the folder name for "put in X" style triggers', () => {
    expect(matchCommand('put it in Travel')).toMatchObject({
      command: 'move',
      argument: 'travel',
    })
  })

  it('returns null when nothing matches', () => {
    expect(matchCommand('what time is it')).toBeNull()
  })

  it('prefers a move trigger match over a fixed phrase match', () => {
    // "move to X" should win even though no fixed phrase is present
    expect(matchCommand('move to Spam')).toMatchObject({ command: 'move' })
  })
})
