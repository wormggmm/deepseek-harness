---
description: "Composer Enter binding for the Web GUI: Cmd/Ctrl+Enter sends and plain Enter inserts a line break, for deployments that prefer that chord over the shipped Enter-send default."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-enter-send

English | [中文](README.zh.md)

## Summary

This plugin inverts the Web composer's Enter gesture: Cmd/Ctrl+Enter submits the draft and plain Enter inserts a line break, while Shift+Enter keeps its unconditional newline. It contributes one browser service and no UI of its own, and it changes nothing about what a submission delivers — the same submission path, delivery modes, and busy-state policy apply. The package affects browser key handling only; it does not assemble or send model requests.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this row alongside `ui-conversation` and the composer's Enter key changes meaning: Cmd/Ctrl+Enter becomes the only submit gesture, and every other consulted Enter (including a held-down one) reaches the editor's own line break. The shipped Web roster already carries it as the `ui-enter-send` row; removing that row, or disabling it in `$DSH_HOME/cordis.patch.yml`, restores the default binding where plain Enter sends and Shift+Enter breaks the line, with no composer change either way.

Cmd/Ctrl+Enter submits as the accelerated gesture, exactly as that chord does under the default binding: while the addressed agent is running, it performs the complementary delivery of the Host-backed busy-Enter preference (the default `Queue` preference makes it a Steer), and with an empty draft it steers every still-pending queued message into the running turn. Plain Enter never submits, so a message cannot be sent by accident while composing a multi-line draft.

Commands still own the keys around it: an open `/` or `@` menu settles its highlight on Enter, IME composition keeps its Enter, and the chords the composer consumes itself (Alt, AltGraph, Ctrl+Cmd, Ctrl/Cmd+Shift) are unchanged.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser half provides `composerEnterBinding` — the optional service `ui-conversation` declares in `contract/enter-binding.ts` — as a pure function over the keydown's modifiers (`gesture.ctrl || gesture.meta ? 'submit' : 'newline'`). The composer bar resolves the service per inject with `ctx.get` and falls back to its shipped `DEFAULT_ENTER_BINDING` (every consulted Enter submits) when this row is absent, so the plugin is the whole opt-in and the composer needs no knowledge of it. The binding is process-global, matching every other client service; per-session gestures would need a different seam. No `./invariant` companion is published because the binding is a pure function of its argument and the provide is an effect owned by the cordis service registry — there is no second runtime authority to compare against.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-conversation](../ui-conversation/README.md) — owns the composer, the Enter keymap, and the `composerEnterBinding` seam this plugin fills.
- [Composer Enter-key binding note](../../../.agents/notes/implemented/feature/2026-08-18-composer-enter-binding.md) — why the seam is a service and a plugin row rather than a setting.
- [Web client architecture](../../../docs/subsystems/web-client.md) — how browser plugin rows load, register, and are composed out.

-----

<a id="model-experience"></a>
## Model Experience

None, as the binding only decides a browser key gesture; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Shift+Enter cannot be rebound to submit.** The composer decides Shift+Enter as an unconditional native line break before any binding is consulted (its IME guard), so one would have to change the composer, not provide a binding.
- **A binding takes effect on the next inject.** The composer bar resolves the service per inject, so a plugin mounted after a session's composer already rendered applies on that session's next remount; restarting the page is the reliable activation path.
- **One binary choice per process.** The service answers from its own call site for every Session, and the shipped roster composes exactly one binding.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The binding is a pure function of its own argument, and the provide is an effect owned by the cordis service registry; registration disposal is asserted by this package's service spec.
