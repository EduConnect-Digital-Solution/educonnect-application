import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { pushStatus, enablePush, disablePush } from '../../utils/pushNotifications.js';
import { notify } from '../patterns/toastBus.js';

/** A menu row that turns phone/desktop notifications on or off for this device. Hidden where unsupported. */
export default function PushToggle({ className = '', compact = false }) {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { let alive = true; pushStatus().then((s) => alive && setStatus(s)); return () => { alive = false; }; }, []);
    if (!status || status === 'unsupported') return null;

    const on = status === 'on';
    const toggle = async () => {
        setBusy(true);
        try {
            if (on) { await disablePush(); setStatus('off'); notify.info('Notifications turned off on this device.'); }
            else { await enablePush(); setStatus('on'); notify.success('Notifications turned on for this device.'); }
        } catch (e) { notify.error(e.message); setStatus(await pushStatus()); } finally { setBusy(false); }
    };

    const label = status === 'denied' ? 'Notifications blocked' : on ? 'Notifications on' : 'Turn on notifications';
    if (compact) {
        return (
            <button type="button" onClick={toggle} disabled={busy || status === 'denied'} aria-label={label} title={label} className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
                {on ? <Bell className="w-5 h-5 text-blue-600" /> : <BellOff className="w-5 h-5 text-gray-600" />}
            </button>
        );
    }

    return (
        <button type="button" onClick={toggle} disabled={busy || status === 'denied'} title={status === 'denied' ? 'Notifications are blocked in your browser settings' : undefined}
            className={className || 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50'}>
            {on ? <Bell size={15} className="text-blue-600" /> : <BellOff size={15} className="text-gray-400" />}
            {label}
        </button>
    );
}
