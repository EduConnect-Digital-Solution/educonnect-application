import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hammer } from 'lucide-react';

/**
 * PagePlaceholder — the first-use surface for modules whose workflows are still
 * being built. It is honest (clearly "in design"), purposeful (explains what the
 * module will do), and never a dead end (links to what works today).
 */
export default function PagePlaceholder({
    icon,
    accent = 'blue',
    title,
    description,
    planned = [],
    availableToday = [],
}) {
    const Icon = icon;
    const accentStyles = {
        blue:   { tile: 'bg-blue-50 text-blue-600',     ring: 'ring-blue-100' },
        green:  { tile: 'bg-green-50 text-green-600',   ring: 'ring-green-100' },
        purple: { tile: 'bg-purple-50 text-purple-600', ring: 'ring-purple-100' },
        amber:  { tile: 'bg-amber-50 text-amber-600',   ring: 'ring-amber-100' },
        rose:   { tile: 'bg-rose-50 text-rose-600',     ring: 'ring-rose-100' },
    }[accent] ?? { tile: 'bg-blue-50 text-blue-600', ring: 'ring-blue-100' };

    return (
        <div className="flex justify-center px-4 py-10 lg:py-16">
            <div className="w-full max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-10 text-center shadow-sm">
                    <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ring-8 ${accentStyles.tile} ${accentStyles.ring}`}>
                        <Icon size={26} />
                    </div>

                    <div className="inline-flex items-center gap-1.5 mt-5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        <Hammer size={11} /> In design
                    </div>

                    <h1 className="mt-3 text-xl font-bold text-gray-900">{title}</h1>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-md mx-auto">{description}</p>

                    {planned.length > 0 && (
                        <div className="mt-7 text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                What this page will do
                            </p>
                            <div className="grid sm:grid-cols-2 gap-2.5">
                                {planned.map(item => (
                                    <div key={item} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                        <span className="text-[13px] font-medium text-gray-600 leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableToday.length > 0 && (
                        <div className="mt-7 pt-6 border-t border-gray-100 text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                Available today
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {availableToday.map(link => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/40 transition-colors"
                                    >
                                        {link.label}
                                        <ArrowRight size={13} className="text-gray-400" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
