import { randomBytes } from 'crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { decryptToken, encryptToken } from './tokenCrypto'

describe('tokenCrypto', () => {
  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = randomBytes(32).toString('base64')
  })

  it('round-trips plaintext through encrypt/decrypt', () => {
    const plaintext = 'super-secret-oauth-refresh-token'
    const payload = encryptToken(plaintext)
    expect(decryptToken(payload)).toBe(plaintext)
  })

  it('produces a different IV and ciphertext for repeated calls', () => {
    const a = encryptToken('same-input')
    const b = encryptToken('same-input')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('throws when TOKEN_ENC_KEY is missing', () => {
    delete process.env.TOKEN_ENC_KEY
    expect(() => encryptToken('x')).toThrow('Missing TOKEN_ENC_KEY')
  })

  it('throws when TOKEN_ENC_KEY does not decode to 32 bytes', () => {
    process.env.TOKEN_ENC_KEY = Buffer.from('too-short').toString('base64')
    expect(() => encryptToken('x')).toThrow('must decode to 32 bytes')
  })

  it('fails to decrypt when the auth tag has been tampered with', () => {
    const payload = encryptToken('secret')
    payload.authTag = randomBytes(16).toString('base64')
    expect(() => decryptToken(payload)).toThrow()
  })
})
