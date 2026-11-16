import { createContext, useContext } from 'react';

/**
 * True once the signed-in school's locale settings (currency, timezone, date format) are loaded.
 * Protected pages wait for it so nothing is first painted in the default format.
 */
export const LocaleReadyContext = createContext(true);
export const useLocaleReady = () => useContext(LocaleReadyContext);
