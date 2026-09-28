// @vitest-environment jsdom
/**
 * Keymap routing at the DOM boundary: synthetic keydowns on the
 * contenteditable reach the registered composer commands (the jsdom lane's
 * gesture entry, below the full component bench).
 */
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical'
import { registerPlainText } from '@lexical/plain-text'
import { registerComposerKeymap } from '../src/client/input/editor/keymap.ts'
import type { ComposerEnterGesture } from '../src/client/contract/enter-binding.ts'

describe('keymap keydown routing', () => {
  it('clears composition presentation on root swaps and unregisters pending callbacks', async () => {
    const editor = createEditor({ namespace: 'composition-root', onError: (e) => { throw e } })
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)
    onTestFinished(() => {
      editor.setRootElement(null)
      first.remove()
      second.remove()
    })
    editor.setRootElement(first)
    const unregister = registerComposerKeymap(editor, {
      arbitrate: () => 'pass', space: () => false, dismissPopup: () => {},
      canSubmit: () => false, resolveEnter: () => 'submit',
      submit: () => {}, intakeFiles: () => {}, pasteText: () => {},
    })
    onTestFinished(unregister)
    fireEvent.compositionStart(first)
    expect(first.hasAttribute('data-composer-composing')).toBe(true)
    editor.setRootElement(second)
    expect(first.hasAttribute('data-composer-composing')).toBe(false)
    expect(second.hasAttribute('data-composer-composing')).toBe(false)
    fireEvent.compositionStart(first)
    expect(first.hasAttribute('data-composer-composing')).toBe(false)
    fireEvent.compositionStart(second)
    expect(second.hasAttribute('data-composer-composing')).toBe(true)
    fireEvent.compositionEnd(second, { data: '' })
    unregister()
    await Promise.resolve()
    expect(second.hasAttribute('data-composer-composing')).toBe(false)
    fireEvent.compositionStart(second)
    expect(second.hasAttribute('data-composer-composing')).toBe(false)
  })

  it('routes Enter to the keymap submit handler', () => {
    const editor = createEditor({ namespace: 'keymap-routing', onError: (e) => { throw e } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    editor.setRootElement(root)
    registerPlainText(editor)
    const submit = vi.fn()
    registerComposerKeymap(editor, {
      arbitrate: () => 'pass',
      space: () => false,
      dismissPopup: () => {},
      canSubmit: () => true,
      resolveEnter: () => 'submit',
      submit,
      intakeFiles: () => {},
      pasteText: () => {},
    })
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(submit).toHaveBeenCalledWith(false)
    fireEvent.keyDown(root, { key: 'Enter', metaKey: true })
    expect(submit).toHaveBeenCalledWith(true)
  })

  it.each([
    { altKey: true },
    { altKey: true, metaKey: true },
    { altKey: true, ctrlKey: true },
    { ctrlKey: true, metaKey: true },
    { shiftKey: true, metaKey: true },
    { shiftKey: true, ctrlKey: true },
    { shiftKey: true, altKey: true },
  ])('leaves modified Enter %j available to application commands', async (modifiers) => {
    const editor = createEditor({ namespace: 'modified-enter', onError: (error) => { throw error } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    onTestFinished(() => { editor.setRootElement(null); root.remove() })
    editor.setRootElement(root)
    onTestFinished(registerPlainText(editor))
    const submit = vi.fn()
    const arbitrate = vi.fn(() => 'pass' as const)
    onTestFinished(registerComposerKeymap(editor, {
      arbitrate, space: () => false, dismissPopup: () => {}, canSubmit: () => true,
      resolveEnter: () => 'submit', submit, intakeFiles: () => {}, pasteText: () => {},
    }))
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('unsent draft'))
      $getRoot().append(paragraph)
      paragraph.selectEnd()
    }, { discrete: true })
    const applicationKeydown = vi.fn()
    document.addEventListener('keydown', applicationKeydown)
    onTestFinished(() => { document.removeEventListener('keydown', applicationKeydown) })

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...modifiers })
    root.dispatchEvent(event)
    await Promise.resolve()

    expect(submit).not.toHaveBeenCalled()
    expect(arbitrate).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    expect(applicationKeydown).toHaveBeenCalledOnce()
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('unsent draft')
  })

  it('routes Tab through arbitration and passes when unconsumed', () => {
    const editor = createEditor({ namespace: 'keymap-routing', onError: (e) => { throw e } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    editor.setRootElement(root)
    registerPlainText(editor)
    const arbitrate = vi.fn<(key: string, composing: boolean) => 'consumed' | 'pick-highlighted' | 'pass'>()
      .mockReturnValueOnce('consumed')
      .mockReturnValueOnce('pick-highlighted')
      .mockReturnValue('pass')
    registerComposerKeymap(editor, {
      arbitrate,
      space: () => false,
      dismissPopup: () => {},
      canSubmit: () => true,
      resolveEnter: () => 'submit',
      submit: () => {},
      intakeFiles: () => {},
      pasteText: () => {},
    })
    const consumed = fireEvent.keyDown(root, { key: 'Tab', keyCode: 9 })
    expect(arbitrate).toHaveBeenCalledWith('tab', false)
    expect(consumed).toBe(false) // consumed: preventDefault fired
    const picked = fireEvent.keyDown(root, { key: 'Tab', keyCode: 9 })
    expect(picked).toBe(false) // picked: the completion replaces native traversal
    const passed = fireEvent.keyDown(root, { key: 'Tab', keyCode: 9 })
    expect(passed).toBe(true) // pass: the browser keeps native focus traversal

    // Shift+Tab is the menu's exit key, never its settle key.
    fireEvent.keyDown(root, { key: 'Tab', keyCode: 9, shiftKey: true })
    expect(arbitrate).toHaveBeenLastCalledWith('tabBack', false)
  })

  /** One editor with a seeded paragraph and the caret at its end. */
  function seedCaret(editor: ReturnType<typeof createEditor>): void {
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('unsent draft'))
      $getRoot().append(paragraph)
      paragraph.selectEnd()
    }, { discrete: true })
  }

  it('an inverted binding keeps plain Enter native and moves the submit gesture to Cmd/Ctrl+Enter', async () => {
    const editor = createEditor({ namespace: 'binding-enter', onError: (e) => { throw e } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    onTestFinished(() => { editor.setRootElement(null); root.remove() })
    editor.setRootElement(root)
    onTestFinished(registerPlainText(editor))
    const submit = vi.fn()
    // The ui-enter-send shape: Cmd/Ctrl submits, every other Enter breaks the line.
    const resolveEnter = vi.fn((gesture: ComposerEnterGesture) =>
      (gesture.ctrl || gesture.meta ? 'submit' : 'newline') as 'submit' | 'newline')
    onTestFinished(registerComposerKeymap(editor, {
      arbitrate: () => 'pass', space: () => false, dismissPopup: () => {}, canSubmit: () => true,
      resolveEnter, submit, intakeFiles: () => {}, pasteText: () => {},
    }))
    seedCaret(editor)

    const plain = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    root.dispatchEvent(plain)
    await Promise.resolve()

    expect(submit).not.toHaveBeenCalled()
    // Our handler returned false, so @lexical/plain-text's own fallback ran:
    // it inserts the break the draft projects as a newline, and owns the
    // preventDefault (an Alt chord, by contrast, stays available to the page).
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('unsent draft\n')
    expect(plain.defaultPrevented).toBe(true)
    expect(resolveEnter).toHaveBeenCalledWith({ shift: false, ctrl: false, meta: false, alt: false })

    fireEvent.keyDown(root, { key: 'Enter', ctrlKey: true })
    expect(submit).toHaveBeenCalledWith(true)
    fireEvent.keyDown(root, { key: 'Enter', metaKey: true })
    expect(submit).toHaveBeenCalledTimes(2)
  })

  it('decides Enter through arbitration before the binding', () => {
    const editor = createEditor({ namespace: 'binding-arbitration', onError: (e) => { throw e } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    onTestFinished(() => { editor.setRootElement(null); root.remove() })
    editor.setRootElement(root)
    onTestFinished(registerPlainText(editor))
    const resolveEnter = vi.fn(() => 'newline' as const)
    onTestFinished(registerComposerKeymap(editor, {
      arbitrate: () => 'consumed', space: () => false, dismissPopup: () => {}, canSubmit: () => true,
      resolveEnter, submit: () => {}, intakeFiles: () => {}, pasteText: () => {},
    }))
    seedCaret(editor)

    // A consumed menu pick never reaches the binding, so the highlight still
    // settles on Enter while the binding owns the unconsumed fall-through.
    fireEvent.keyDown(root, { key: 'Enter' })
    expect(resolveEnter).not.toHaveBeenCalled()
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('unsent draft')
  })

  it('never consults the binding for Shift+Enter or the Alt chords', async () => {
    const editor = createEditor({ namespace: 'binding-guards', onError: (e) => { throw e } })
    const root = document.createElement('div')
    root.contentEditable = 'true'
    document.body.appendChild(root)
    onTestFinished(() => { editor.setRootElement(null); root.remove() })
    editor.setRootElement(root)
    onTestFinished(registerPlainText(editor))
    const resolveEnter = vi.fn(() => 'newline' as const)
    const submit = vi.fn()
    onTestFinished(registerComposerKeymap(editor, {
      arbitrate: () => 'pass', space: () => false, dismissPopup: () => {}, canSubmit: () => true,
      resolveEnter, submit, intakeFiles: () => {}, pasteText: () => {},
    }))
    seedCaret(editor)

    const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    root.dispatchEvent(shiftEnter)
    await Promise.resolve()
    expect(resolveEnter).not.toHaveBeenCalled()
    expect(submit).not.toHaveBeenCalled()
    // Shift+Enter broke the line through Lexical's fallback, not through a submit.
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('unsent draft\n')

    // The Alt chord is consumed by the keymap itself: no break, no submit, and
    // the keydown stays available to application handlers.
    const altEnter = new KeyboardEvent('keydown', { key: 'Enter', altKey: true, bubbles: true, cancelable: true })
    root.dispatchEvent(altEnter)
    await Promise.resolve()
    expect(altEnter.defaultPrevented).toBe(false)
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('unsent draft\n')
  })
})
