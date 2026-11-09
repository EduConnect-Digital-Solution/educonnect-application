import React, { useState } from 'react';
import { getInitials } from './avatarUtils.js';

/**
 * Avatar — THE single avatar for the whole platform.
 *
 * Shows the user's profileImage when present; otherwise initials on a stable,
 * name-derived colour. Never hand-roll an avatar circle again — use this.
 *
 *   <Avatar name="Ada Ife" src={user.profileImage} size="md" />
 *
 * size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number (px)
 */

const SIZE_MAP = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

// Deterministic tint per name so the same person is always the same colour.
const TINTS = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
];

function tintFor(name = '') {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return TINTS[sum % TINTS.length];
}

export default function Avatar({ name = '', src, size = 'md', rounded = 'full', className = '' }) {
    const [broken, setBroken] = useState(false);
    const px = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 40);
    const radius = rounded === 'lg' ? 'rounded-xl' : 'rounded-full';
    const fontPx = Math.round(px * 0.4);
    const showImage = src && !broken;

    return (
        <span
            className={`inline-flex items-center justify-center overflow-hidden shrink-0 font-semibold ${radius} ${showImage ? 'bg-gray-100' : tintFor(name)} ${className}`}
            style={{ width: px, height: px }}
            title={name || undefined}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() => setBroken(true)}
                />
            ) : (
                <span style={{ fontSize: fontPx, lineHeight: 1 }}>{getInitials(name)}</span>
            )}
        </span>
    );
}
