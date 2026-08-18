/**
 * Enter-send plugin, node half.
 *
 * Deliberately empty. The whole plugin is a browser-side service provide:
 * the composer bar resolves `composerEnterBinding` through the client
 * service registry, so nothing belongs on the host plane.
 */

/** Host plugin body — the binding ships with the browser half only. */
export function apply(): void {}
