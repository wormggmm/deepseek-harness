# @deepseek-ai/dsh-client-ui-enter-send

English | [中文](README.zh.md)

Web composer Enter-binding plugin: the browser half provides the `composerEnterBinding` service the conversation composer bar consults for its Enter key. The binding makes Cmd/Ctrl+Enter submit the draft — the accelerated gesture the busy-state submission policy resolves (Steer while a primary session is running with the default Queue preference, and the whole-queue steering gesture on an empty draft) — and lets plain Enter insert a line break natively. Shift+Enter stays an unconditional newline, decided in the composer before any binding, exactly as without this plugin. The shipped Web patch is the only composition that loads this package; removing its one cordis.yml entry (`ui-enter-send`) restores the default binding where Enter submits and Shift+Enter inserts a line break.

The binding is a pure function of the keydown's modifiers, so the plugin carries no state, no settings namespace, and no per-session surface: mounting the row is the whole opt-in. IME composition and popup arbitration keep their precedence — a composing Enter confirms the input method's candidate, and an open slash menu still lets Enter pick the highlighted command.

## Model Experience

None, as the binding only decides a browser key gesture; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Shift+Enter cannot be rebound to submit.** The composer treats Shift+Enter as an unconditional native newline before any binding is consulted (an IME composition guard), so a binding that wanted to make it submit would require a composer change, not a plugin.
- **A binding is fixed at first render of a session.** The composer bar resolves the service per inject, so a plugin mounted after a session's composer already rendered takes effect on that session's next remount; restarting the page is the reliable activation path.
