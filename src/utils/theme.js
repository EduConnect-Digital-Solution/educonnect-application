const STORAGE_KEY = 'color-scheme';

export function getTheme() {
    return localStorage.getItem(STORAGE_KEY) ?? 'system';
}

export function applyTheme(theme) {
    const root  = document.documentElement;
    const isDark =
        theme === 'dark' ||
        (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);

    root.dataset.theme = isDark ? 'dark' : 'light';
    root.classList.toggle('dark', isDark);          // Tailwind compat
    localStorage.setItem(STORAGE_KEY, theme);

    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: isDark ? 'dark' : 'light' } }));
}

export function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Call once on app entry to restore saved preference:
applyTheme(getTheme());

// Sync with OS preference changes when 'system' is selected:
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
});