/**
 * Status tokens — the platform's single status vocabulary.
 * Kept separate from the StatusChip component so both can be imported
 * without tripping React Fast Refresh.
 */

export const CHIP_TONES = {
    gray:   'bg-gray-100 text-gray-600 border-gray-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

/** Common status strings → tone. Extend here, never inline. */
const STATUS_TONES = {
    // gray
    draft: 'gray', inactive: 'gray', archived: 'gray', void: 'gray', cancelled: 'gray', not_started: 'gray',
    // blue
    partial: 'blue', in_progress: 'blue', submitted: 'blue', processing: 'blue',
    // amber
    pending: 'amber', awaiting: 'amber', awaiting_approval: 'amber', returned: 'amber', expired: 'amber', unverified: 'amber',
    // green
    active: 'green', paid: 'green', published: 'green', completed: 'green', approved: 'green', accepted: 'green', verified: 'green', present: 'green', current: 'green',
    // red
    overdue: 'red', failed: 'red', rejected: 'red', suspended: 'red', absent: 'red',
    // purple
    scheduled: 'purple', upcoming: 'purple',
};

/** Resolve a tone from a raw status string ('Paid', 'in_progress', …) or boolean. */
export function statusTone(status) {
    if (typeof status === 'boolean') return status ? 'green' : 'gray';
    const key = String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return STATUS_TONES[key] ?? 'gray';
}
