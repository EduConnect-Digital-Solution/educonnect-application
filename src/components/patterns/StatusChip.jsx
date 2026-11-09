import React from 'react';
import { CHIP_TONES, statusTone } from './statusTokens.js';

/**
 * StatusChip — THE status indicator for the whole platform.
 *
 * One color vocabulary everywhere (see statusTokens.js):
 *   gray=draft/inactive · blue=in-progress/partial · amber=pending/awaiting
 *   · green=done/published/paid · red=overdue/failed/rejected · purple=scheduled
 *
 * Never style a status by hand — add the mapping to statusTokens.js instead.
 *
 * <StatusChip status="paid" />               — auto tone + label
 * <StatusChip tone="amber">3 pending</StatusChip>  — explicit
 */
export default function StatusChip({ status, tone, children, dot = true, size = 'sm', className = '' }) {
    const resolvedTone = tone ?? statusTone(status);
    const toneClass = CHIP_TONES[resolvedTone] ?? CHIP_TONES.gray;
    const label = children ?? (typeof status === 'boolean'
        ? (status ? 'Active' : 'Inactive')
        : String(status ?? '').replace(/_/g, ' '));

    const sizeClass = size === 'xs'
        ? 'h-[18px] px-1.5 text-[10px] gap-1'
        : 'h-[22px] px-2.5 text-[11px] gap-1.5';

    return (
        <span className={`inline-flex items-center font-semibold capitalize whitespace-nowrap border rounded-full ${sizeClass} ${toneClass} ${className}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />}
            {label}
        </span>
    );
}
