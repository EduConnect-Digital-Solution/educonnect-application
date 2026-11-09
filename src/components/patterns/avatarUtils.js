/** Initials from a display name: "Ada Ife" → "AI". Kept separate from the
 *  Avatar component so importing it doesn't trip React Fast Refresh. */
export function getInitials(name = '') {
    return String(name)
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
}
