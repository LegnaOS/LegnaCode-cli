/**
 * Tests for the secret detector.
 */

import { describe, expect, it } from 'vitest'
import { containsSecrets, detectSecrets, redactSecrets } from '../secretDetector.js'

describe('detectSecrets', () => {
  it('detects AWS access key', () => {
    const matches = detectSecrets('my key is AKIAIOSFODNN7EXAMPLE')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('aws_access_key')
  })

  it('detects GitHub PAT', () => {
    const matches = detectSecrets('token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('github_token')
  })

  it('detects Stripe secret key', () => {
    const matches = detectSecrets('sk_live_' + 'abcdefghijklmnopqrstuv')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('stripe_key')
  })

  it('detects private key header', () => {
    const matches = detectSecrets('-----BEGIN RSA PRIVATE KEY-----')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('private_key')
  })

  it('detects database URL with credentials', () => {
    const matches = detectSecrets('postgres://admin:s3cret@db.example.com:5432/mydb')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('database_url')
  })

  it('detects Slack token', () => {
    const matches = detectSecrets('xoxb-' + '123456789012-1234567890123-abcdefghijklmnopqrstuv')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.type).toBe('slack_token')
  })

  it('returns empty for clean text', () => {
    const matches = detectSecrets('This is just normal text with no secrets.')
    expect(matches).toHaveLength(0)
  })
})

describe('redactSecrets', () => {
  it('replaces secrets with [REDACTED:type]', () => {
    const input = 'AWS key: AKIAIOSFODNN7EXAMPLE is here'
    const result = redactSecrets(input)
    expect(result).toBe('AWS key: [REDACTED:aws_access_key] is here')
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE')
  })

  it('handles multiple secrets', () => {
    const input = 'key=AKIAIOSFODNN7EXAMPLE token=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'
    const result = redactSecrets(input)
    expect(result).toContain('[REDACTED:aws_access_key]')
    expect(result).toContain('[REDACTED:github_token]')
  })

  it('returns unchanged text when no secrets', () => {
    const input = 'Just normal code: const x = 42;'
    expect(redactSecrets(input)).toBe(input)
  })

  it('redacts database URLs', () => {
    const input = 'DATABASE_URL=postgres://user:password@host:5432/db'
    const result = redactSecrets(input)
    expect(result).toContain('[REDACTED:database_url]')
    expect(result).not.toContain('password')
  })
})

describe('containsSecrets', () => {
  it('returns true for text with secrets', () => {
    expect(containsSecrets('key: AKIAIOSFODNN7EXAMPLE')).toBe(true)
  })

  it('returns false for clean text', () => {
    expect(containsSecrets('const x = 42')).toBe(false)
  })
})
