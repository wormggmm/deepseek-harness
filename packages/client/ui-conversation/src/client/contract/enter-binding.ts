/**
 * Composer Enter-key binding vocabulary: the optional service that decides
 * what Enter does on the composer textarea, and how the InputBar consults it.
 */

/** One Enter keydown on the composer textarea, reduced to its modifiers. */
export interface ComposerEnterGesture {
  readonly shift: boolean
  readonly ctrl: boolean
  readonly meta: boolean
  readonly alt: boolean
}

/** Composer Enter decision: insert a line break, or submit the draft. */
export type ComposerEnterAction = 'newline' | 'submit'

/**
 * Optional composer Enter-key binding, consumed via ctx.get('composerEnterBinding'):
 * absent keeps the shipped binding — every Enter submits, with Cmd/Ctrl
 * marking the accelerated gesture for the busy-state policy. A binding is
 * consulted only after IME composition and popup arbitration let the key
 * through, and never for Shift+Enter (the unconditional native newline,
 * decided before the binding in InputBar).
 */
export interface ComposerEnterBinding {
  /**
   * Decide one Enter keydown on the composer textarea.
   * @param gesture - modifier flags of the keydown; `shift` is informational
   * (Shift+Enter never reaches the binding).
   * @returns 'newline' to let the native line-break insertion proceed, or
   * 'submit' to send the draft (Cmd/Ctrl-held submits as the accelerated
   * gesture).
   */
  resolve(gesture: ComposerEnterGesture): ComposerEnterAction
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Optional composer Enter-key binding provider (ui-enter-send); absent =
     * the shipped binding (Enter submits, Shift+Enter newline).
     */
    composerEnterBinding: ComposerEnterBinding
  }
}
