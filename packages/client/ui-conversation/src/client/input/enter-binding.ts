/**
 * Shipped composer Enter binding, used when no plugin provides
 * `composerEnterBinding`: every Enter the keymap consults submits. The
 * unconditional Shift+Enter native line break is decided before the binding,
 * so `shift` never reaches it; Cmd/Ctrl marks the accelerated gesture for the
 * busy-state submission policy.
 */
import type { ComposerEnterBinding } from '../contract/enter-binding.ts'

export const DEFAULT_ENTER_BINDING: ComposerEnterBinding = {
  resolve: () => 'submit',
}
