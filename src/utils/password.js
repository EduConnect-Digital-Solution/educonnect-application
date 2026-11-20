/**
 * The password rules shown on every screen that sets a password (school registration,
 * completing an invitation, resetting a password), so they cannot drift apart.
 */
export const PASSWORD_SPECIALS = '!@#$%^&*';

/** The first rule a password breaks, as a sentence for the user, or null when it is acceptable. */
export function passwordProblem(password) {
    const pw = String(password ?? '');
    if (!pw) return 'Password is required.';
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password needs at least one uppercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password needs at least one number.';
    if (!/[!@#$%^&*]/.test(pw)) return `Password needs at least one special character (${PASSWORD_SPECIALS}).`;
    return null;
}
