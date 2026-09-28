/**
 * ui-enter-send browser half: the binding's modifier matrix and the provide
 * lifecycle (mounting the fiber publishes the service; disposing retracts it).
 * The composer bar's adoption of a binding is asserted by the ui-conversation
 * input-bar and keymap specs.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ComposerEnterBinding } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'

/** The service face as the composer bar resolves it. */
const bindingOf = (ctx: Context): ComposerEnterBinding | undefined => ctx.get('composerEnterBinding')

describe('composerEnterBinding service', () => {
  it('resolves Cmd/Ctrl to submit and every other consulted Enter to a line break', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const binding = bindingOf(ctx)
    expect(binding).toBeDefined()

    expect(binding!.resolve({ shift: false, ctrl: false, meta: false, alt: false })).toBe('newline')
    expect(binding!.resolve({ shift: false, ctrl: true, meta: false, alt: false })).toBe('submit')
    expect(binding!.resolve({ shift: false, ctrl: false, meta: true, alt: false })).toBe('submit')
    // Both modifiers: still one submit gesture.
    expect(binding!.resolve({ shift: false, ctrl: true, meta: true, alt: false })).toBe('submit')
    // The keymap decides these before any binding; the answers stay line breaks.
    expect(binding!.resolve({ shift: true, ctrl: false, meta: false, alt: false })).toBe('newline')
    expect(binding!.resolve({ shift: false, ctrl: false, meta: false, alt: true })).toBe('newline')

    await fiber.dispose()
    expect(bindingOf(ctx)).toBeUndefined()
  })

  it('declares no service dependencies', () => {
    // The binding is resolved by its consumers; the provider waits for nothing.
    expect(inject).toEqual([])
  })
})
