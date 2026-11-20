/**
 * Toast bus — the imperative API for the ToastHost component.
 * Separated from the component so it can be imported anywhere without
 * tripping React Fast Refresh.
 *
 *   pushToast({ message: 'Invoice created' })
 *   pushToast({ message: 'Student archived', undo: async () => { … } })
 */
export const TOAST_EVENT = 'educonnect:toast';
let seq = 0;

export function pushToast({ message, type, undo, duration }) {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
        detail: {
            id: ++seq,
            message,
            type: type || (undo ? 'info' : 'success'),
            undo,
            duration: duration ?? (type === 'error' ? 6000 : (undo ? 8000 : 4000)),
        },
    }));
}

/**
 * Short helpers so call sites stay one line and always carry an explicit type.
 *   notify.success('Saved.')  notify.error('Could not save.')  notify.info('Heads up.')
 * `notify(message, type, duration, onDone)` also runs `onDone` after `duration`
 * ms, for flows that redirect once the toast has been read.
 */
export function notify(message, type = 'error', duration, onDone) {
    pushToast({ message, type, duration });
    if (onDone) setTimeout(onDone, duration ?? 3000);
}
notify.success = (message, duration) => pushToast({ message, type: 'success', duration });
notify.error = (message, duration) => pushToast({ message, type: 'error', duration });
notify.info = (message, duration) => pushToast({ message, type: 'info', duration });

