import React from 'react';

/** A one-line notice for a secondary list that failed to load (for example the class list behind a filter). */
export default function LoadErrorNotice({ message, onRetry }) {
    return (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {message}{' '}
            {onRetry && (
                <button type="button" onClick={onRetry} className="font-semibold underline">Try again</button>
            )}
        </p>
    );
}
