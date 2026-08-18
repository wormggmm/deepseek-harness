// @vitest-environment jsdom
/**
 * ui-enter-send browser half: the binding's modifier matrix, the provide
 * lifecycle (fiber mount / dispose retracts the service), and the assembled
 * composer behavior — plain Enter stays native while Cmd/Ctrl+Enter
 * submits through the real conversation plugin.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ISession, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotTestRuntime, stubSettingsScope, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyConversation, inject as conversationInject } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply, inject } from '../src/client/index.ts'

usePinnedBrowserLanguages('zh-CN')

const SID = 's1' as SessionId

/** jsdom has no ResizeObserver; the composer seat publishes its height through one. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

interface ServiceFace {
  resolve(gesture: { shift: boolean; ctrl: boolean; meta: boolean; alt: boolean }): string
}

const getService = (ctx: Context): ServiceFace | undefined =>
  (ctx as unknown as { get(name: string): ServiceFace | undefined }).get('composerEnterBinding')

describe('service lifecycle', () => {
  it('provides composerEnterBinding while mounted and retracts it on dispose', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const service = getService(ctx)
    expect(service).toBeDefined()
    // Enter and Shift+Enter insert line breaks; the Cmd/Ctrl chords submit.
    expect(service?.resolve({ shift: false, ctrl: false, meta: false, alt: false })).toBe('newline')
    expect(service?.resolve({ shift: true, ctrl: false, meta: false, alt: false })).toBe('newline')
    expect(service?.resolve({ shift: false, ctrl: true, meta: false, alt: false })).toBe('submit')
    expect(service?.resolve({ shift: false, ctrl: false, meta: true, alt: false })).toBe('submit')
    expect(service?.resolve({ shift: false, ctrl: false, meta: false, alt: true })).toBe('newline')
    expect(service?.resolve({ shift: true, ctrl: true, meta: false, alt: false })).toBe('submit')
    await fiber.dispose()
    expect(getService(ctx)).toBeUndefined()
  })
})

describe('assembled composer', () => {
  type AppRootProps = PropsRenderSlots<'conversation' | 'details'>
  function AppRoot({ renderSlot }: AppRootProps) {
    return <>{renderSlot('conversation', {})}</>
  }

  const LAYOUT_CHILDREN = {
    'conversation': { kind: 'single', scope: 'session-maybe' },
    'details': { kind: 'single', scope: 'session' },
  } as const

  async function bench(withPlugin: boolean) {
    const runtime = await SlotTestRuntime.create()
    runtime.provide('connection', { api: { settings: {} }, isLoopback: false })
    runtime.provide('remote', { $on: () => () => {} })
    runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
    runtime.provide('layout', { openDetails: vi.fn(), closeDetails: vi.fn() })
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.slots.installLocale(locale)
    const prompt = vi.fn<ISession['prompt']>(async () => ({ ok: true, value: { accepted: true } }))
    await runtime.sessions.add({
      id: SID,
      summary: { title: 'S', displayTitle: 'S', cwd: '/proj' },
      snapshot: { nodes: [] },
      session: {
        loadOlder: vi.fn<ISession['loadOlder']>(),
        prompt,
      },
    })
    await runtime.root.declare(LAYOUT_CHILDREN, AppRoot)
    await runtime.mount({ inject: [...conversationInject], apply: applyConversation })
    if (withPlugin) await runtime.mount({ inject, apply })
    const view = runtime.renderRoot()
    const textarea = view.container.querySelector('textarea')!
    return { runtime, view, textarea, prompt }
  }

  it('lets plain Enter insert a line break and sends on Cmd/Ctrl+Enter', async () => {
    const { runtime, textarea, prompt } = await bench(true)
    try {
      fireEvent.change(textarea, { target: { value: 'hello' } })
      // Not preventDefault'd: the native textarea insertion proceeds.
      expect(fireEvent.keyDown(textarea, { key: 'Enter' })).toBe(true)
      expect(prompt).not.toHaveBeenCalled()
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
      await waitFor(() => { expect(prompt).toHaveBeenCalledTimes(1) })
      const [content] = prompt.mock.calls[0] as unknown as [{ text: string }[], string]
      expect(content[0]?.text).toBe('hello')
    } finally {
      await runtime.dispose()
    }
  })

  it('without the plugin, plain Enter keeps the default submit behavior', async () => {
    const { runtime, textarea, prompt } = await bench(false)
    try {
      fireEvent.change(textarea, { target: { value: 'hello' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })
      await waitFor(() => { expect(prompt).toHaveBeenCalledTimes(1) })
    } finally {
      await runtime.dispose()
    }
  })
})
