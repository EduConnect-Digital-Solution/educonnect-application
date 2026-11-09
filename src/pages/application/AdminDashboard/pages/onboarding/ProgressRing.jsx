import React from 'react';

/** Small circular progress ring. Pure SVG, no deps. */
export default function ProgressRing({ percent = 0, size = 44, stroke = 4, children }) {
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (percent / 100) * circ;
    const done = percent >= 100;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={done ? '#16a34a' : '#2563eb'} strokeWidth={stroke}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700">
                {children ?? `${percent}%`}
            </span>
        </div>
    );
}
