/**
 * Where to go after signing in: the page the person was trying to open before being sent to sign in.
 * Only a dashboard page of the role that signed in is used, so a link can never send someone off-site
 * or into another role's pages.
 */
const KEY = 'ec_return_to';

export function rememberReturnPath(path) {
    try { sessionStorage.setItem(KEY, path); } catch { /* storage unavailable */ }
}

/** The dashboard path to open for this role, using (and forgetting) a remembered page when it fits. */
export function takeReturnPath(role) {
    const home = `/dashboard/${role}`;
    let saved = null;
    try {
        saved = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch { /* storage unavailable */ }
    if (typeof saved === 'string' && (saved === home || saved.startsWith(`${home}/`) || saved.startsWith(`${home}?`))) {
        return saved;
    }
    return home;
}
