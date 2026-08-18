# Agent Note: Composer Enter-key binding

Status: implemented

English | [中文](2026-08-18-composer-enter-binding.zh.md)

## Problem

The composer textarea's Enter semantics were a hardcoded branch in InputBar's keydown handler: Shift+Enter inserted a line break unconditionally and every other Enter submitted, with Cmd/Ctrl marking the accelerated gesture for the busy-state policy. A deployment that wanted Ctrl+Enter to send and plain Enter to insert a line break had no seam to express that — the alternatives were editing the composer itself or replacing the whole `conversation.composer.bar` slot (a single seat whose occupant re-implements the entire bar, draft machine wiring included).

## Decision

**The composer bar resolves an optional `composerEnterBinding` service and asks it for every Enter keydown that survives the existing guards.** The service follows the `chatFileMentions` precedent: ui-conversation declares the `ComposerEnterBinding` contract and the cordis Context merge in `contract/enter-binding.ts`, consumes it with `ctx.get` inside the composer-bar inject factory (so a plugin mounted later is picked up at the next inject), and falls back to a shipped `DEFAULT_ENTER_BINDING` (every consulted Enter submits) when no plugin provides it. InputBar consults the binding after the IME-composition guard and popup arbitration and before `preventDefault`: a `'newline'` answer lets the native textarea insertion proceed, a `'submit'` answer runs the existing submission path unchanged. Shift+Enter keeps its unconditional native newline, decided before the binding so IME-closing Shift+Enter still breaks the line, and the binding's `shift` field is documented as informational.

**The inverted binding ships as a plugin, not as a composer option.** `@deepseek-ai/dsh-client-ui-enter-send` provides the service (Cmd/Ctrl+Enter submits, everything else inserts a line break) and is mounted as the `ui-enter-send` row in the shipped web-app roster, next to the other browser plugin rows. The busy-state policy is untouched: the accelerated chord still steers while running, and the empty-draft accelerated chord still steers the whole queue, because the plugin only decides which keys reach the submission path. Removing the roster row (or disabling it in `$DSH_HOME/cordis.patch.yml`) restores Enter-send with zero composer changes.

## Alternatives considered

**A `sendOn` settings field on the conversation namespace** (the `busyEnter` shape: a `ConversationSettings` key, a General-Settings row, a durable `settings.yaml` value). Rejected because it hardcodes one product opinion as a first-class setting and gives every user a toggle for what this deployment wanted as a fixed default; the plugin row is the off switch, which is the same surface the other feature plugins use, and a settings field would still have required the InputBar branch it was meant to avoid.

**Replacing the `conversation.composer.bar` slot with a forked InputBar.** Rejected because the seat is `kind: 'single'` and `session-maybe`: a fork re-implements the whole bar (draft mirror, decorations, drag intake, Safari recovery, control seats) to change one key, and any composer improvement then has to be copied into the fork.

**A full keymap registry** (multiple named bindings, per-session resolution, a settings surface). Rejected as speculative: there is exactly one consumer and one alternative binding today; the service seam is the same shape a future registry would need, and growing it now would add an interface nothing else uses.

**A DOM-level keydown interception outside the slot system** (a document listener that swallows Enter before InputBar). Rejected because it fights the composer's own arbitration and IME handling, cannot distinguish the composer textarea from other Enter-bearing inputs, and would not survive the composer's remount lifecycle as a service would.

## Consequences

A composition without the plugin behaves byte-for-byte as before: `DEFAULT_ENTER_BINDING` resolves every consulted Enter to submit, and the unconditional Shift+Enter newline is unchanged. The web e2e lane is unaffected because its scenarios submit through the send button, never the Enter key. The binding is process-global rather than per-session — matching every other client service — so a per-session choice would need a different seam. The composer resolves the service per inject, so a plugin mounted after a session's bar already rendered takes effect on that session's next remount; the README states the restart as the reliable activation path. Shift+Enter remains non-rebindable by design; making it rebindable would move the IME guard into the binding contract, which no current consumer needs. The busy-Enter preference ([host-backed preferences](../bug-fix/2026-08-06-host-backed-web-preferences.md)) and the input machine ([web input machine and slash pipeline](../architecture/2026-07-25-web-input-machine-and-slash-pipeline.md)) are untouched: the binding sits upstream of both.
