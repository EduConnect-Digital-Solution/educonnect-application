import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * HelpCards — responsive contextual help strip.
 *
 * Desktop (≥ sm): renders a slim "Help" bar with clickable pill chips per card.
 *   Clicking a chip toggles an anchored popover for that card.
 *
 * Mobile (< sm): renders a single collapsible row that expands to show all cards.
 *
 * Props:
 *   cards  – Array<{ icon: LucideComponent, title: string, body: string }>
 *   label? – string — label for the help bar (default "Help")
 */
export default function HelpCards({ cards = [], label = 'Help' }) {
    // Mobile collapse state
    const [mobileOpen, setMobileOpen] = useState(false);

    // Desktop: which card popover is open (-1 = none)
    const [openIdx, setOpenIdx] = useState(-1);

    // Ref array for positioning popovers
    const chipRefs = useRef([]);
    const popoverRef = useRef(null);

    // Close popover on outside click
    useEffect(() => {
        if (openIdx === -1) return;
        function handle(e) {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                !chipRefs.current[openIdx]?.contains(e.target)
            ) {
                setOpenIdx(-1);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [openIdx]);

    // Close on Escape
    useEffect(() => {
        function handle(e) { if (e.key === 'Escape') setOpenIdx(-1); }
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, []);

    const activeCard = openIdx >= 0 ? cards[openIdx] : null;

    return (
        <>
            {/* ── Desktop: horizontal chip strip ──────────────────────────────── */}
            <div className="help-cards-desktop">
                <div className="help-cards-bar">
                    <HelpCircle size={13} className="help-cards-bar-icon" />
                    <span className="help-cards-bar-label">{label}</span>
                    <span className="help-cards-bar-sep" />
                    <div className="help-cards-chips">
                        {cards.map(({ icon: Icon, title }, idx) => {
                            const isActive = openIdx === idx;
                            return (
                                <button
                                    key={title}
                                    ref={el => (chipRefs.current[idx] = el)}
                                    className={`help-chip${isActive ? ' help-chip--active' : ''}`}
                                    onClick={() => setOpenIdx(isActive ? -1 : idx)}
                                    aria-expanded={isActive}
                                    aria-label={title}
                                >
                                    <Icon size={12} className="help-chip-icon" />
                                    <span className="help-chip-label">{title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Popover */}
                {activeCard && (
                    <div className="help-popover" ref={popoverRef} role="dialog" aria-label={activeCard.title}>
                        <div className="help-popover-header">
                            <div className="help-popover-title-row">
                                <activeCard.icon size={14} className="help-popover-icon" />
                                <span className="help-popover-title">{activeCard.title}</span>
                            </div>
                            <button className="help-popover-close" onClick={() => setOpenIdx(-1)} aria-label="Close">
                                <X size={13} />
                            </button>
                        </div>
                        <p className="help-popover-body">{activeCard.body}</p>
                    </div>
                )}
            </div>

            {/* ── Mobile: collapsible strip ────────────────────────────────────── */}
            <div className="help-cards-mobile">
                <button
                    className="help-mobile-toggle"
                    onClick={() => setMobileOpen(o => !o)}
                    aria-expanded={mobileOpen}
                >
                    <HelpCircle size={14} className="help-mobile-toggle-icon" />
                    <span className="help-mobile-toggle-label">{label}</span>
                    <span className="help-mobile-toggle-count">{cards.length} topics</span>
                    {mobileOpen
                        ? <ChevronUp size={14} className="help-mobile-chevron" />
                        : <ChevronDown size={14} className="help-mobile-chevron" />}
                </button>

                {mobileOpen && (
                    <div className="help-mobile-panel">
                        {cards.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="help-mobile-card">
                                <div className="help-mobile-card-header">
                                    <div className="help-mobile-card-icon-wrap">
                                        <Icon size={13} />
                                    </div>
                                    <span className="help-mobile-card-title">{title}</span>
                                </div>
                                <p className="help-mobile-card-body">{body}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
