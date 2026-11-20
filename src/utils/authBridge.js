/**
 * Lets the axios interceptors reach the current auth context without putting it on `window`.
 *
 * The auth context holds the access token, so it must not be a global that any script on the
 * page (analytics, embeds, browser extensions' page scripts) can read. AuthProvider publishes
 * its latest value here on every render; nothing outside the app bundle can import this module.
 */
let current = null;

export const setAuthBridge = (auth) => { current = auth || null; };
export const getAuthBridge = () => current;

/** Requests wait at most this long for the server before failing with a timeout error. */
export const REQUEST_TIMEOUT_MS = 60_000;
/** Uploads, imports and generated downloads are allowed longer. */
export const LONG_REQUEST_TIMEOUT_MS = 180_000;
