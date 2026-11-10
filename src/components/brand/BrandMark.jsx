import React from 'react';
import './brandLoader.css';

// Three shapes traced from the EduConnect logo (viewBox 512 x 551).
const PATHS = {
    left: 'M0 0 C161.7 13.9 229.5 114.1 240 125 L240 297 L0 373 Z',
    right: 'M512 0 C350.3 13.9 282.5 114.1 272 125 L272 297 L512 373 Z',
    base: 'M0 406 L256 326 L512 406 L512 549 L256 469 L0 549 Z',
};

/** The animated logo mark. variant: 'open' | 'assemble' | 'pulse'. */
export default function BrandMark({ size = 48, variant = 'open', tone, mono = false, className = '' }) {
    return (
        <svg
            className={`ec-mark ${className}`.trim()}
            data-variant={variant}
            data-tone={tone}
            data-mono={mono ? '' : undefined}
            width={size}
            height={(size * 551) / 512}
            viewBox="0 0 512 551"
            aria-hidden="true"
            focusable="false"
        >
            <path className="p-left" d={PATHS.left} />
            <path className="p-right" d={PATHS.right} />
            <path className="p-base" d={PATHS.base} />
        </svg>
    );
}
