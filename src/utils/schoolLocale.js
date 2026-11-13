/**
 * The school's locale settings (currency, timezone, date format), shared by every screen.
 *
 * The values come from GET /api/school/settings/public after sign-in (see LocaleLoader in App.jsx)
 * and are cached in localStorage so the first paint already uses them. Money is always handled in
 * minor units (kobo, pesewas, cents) and shown through these helpers.
 */
const KEY = 'educonnect-school-locale';
export const DEFAULT_LOCALE = { currency: 'NGN', locale: 'en-NG', timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY' };

const read = () => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? { ...DEFAULT_LOCALE, ...JSON.parse(raw) } : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
};

let current = read();

export const getSchoolLocale = () => current;

export const setSchoolLocale = (next) => {
    current = { ...DEFAULT_LOCALE, ...(next || {}) };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage unavailable */ }
};

export const clearSchoolLocale = () => {
    current = DEFAULT_LOCALE;
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
};

const moneyFormatter = (decimals) => new Intl.NumberFormat(current.locale, {
    style: 'currency',
    currency: current.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
});

/** Minor units (kobo, pesewas, cents) to a currency string. */
export const formatMinor = (minor = 0, decimals = 2) => moneyFormatter(decimals).format((Number(minor) || 0) / 100);

/** A whole-currency amount (already in naira, cedis, ...) to a currency string. */
export const formatMajor = (amount = 0, decimals = 2) => moneyFormatter(decimals).format(Number(amount) || 0);

export const currencySymbol = () => {
    const part = moneyFormatter(0).formatToParts(0).find((p) => p.type === 'currency');
    return part ? part.value : current.currency;
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A value at exactly 00:00:00.000 UTC is a calendar date (a birth date, a due date), not a moment:
// show that same day everywhere instead of shifting it with the timezone.
const isDateOnly = (d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

/** A date in the school's timezone and chosen format, e.g. 10/11/2026. Empty string for bad input. */
export const formatSchoolDate = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (!value || Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: isDateOnly(d) ? 'UTC' : current.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    const { day, month, year } = parts;
    switch (current.dateFormat) {
        case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
        case 'D MMM YYYY': return `${Number(day)} ${MONTH_SHORT[Number(month) - 1]} ${year}`;
        default: return `${day}/${month}/${year}`;
    }
};

/** Time of day in the school's timezone, e.g. 14:05. */
export const formatSchoolTime = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (!value || Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { timeZone: current.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
};

export const formatSchoolDateTime = (value) => {
    const date = formatSchoolDate(value);
    return date ? `${date}, ${formatSchoolTime(value)}` : '';
};

