/**
 * Enter-send plugin, browser half: provides the `composerEnterBinding`
 * service the conversation composer bar consults for its Enter key. This
 * binding makes Cmd/Ctrl+Enter the submit gesture — the accelerated gesture
 * the busy-state policy resolves — and lets plain Enter reach the editor's
 * own line break; Shift+Enter stays an unconditional newline, decided by the
 * composer keymap before any binding. Export discipline: packages/client/AGENTS.md.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ComposerEnterBinding } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Cmd/Ctrl+Enter submits; every other consulted Enter breaks the line. */
const ENTER_SEND_BINDING: ComposerEnterBinding = {
  resolve: gesture => (gesture.ctrl || gesture.meta ? 'submit' : 'newline'),
}

/** No services to inject: the binding rides the service registry alone. */
export const inject: string[] = []

/**
 * Client plugin body: publish the binding service for the composer bar.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.provide('composerEnterBinding', ENTER_SEND_BINDING)
}
