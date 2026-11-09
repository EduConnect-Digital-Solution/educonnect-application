import React from 'react';
import { formatNaira } from '../../services/feeAPIs.js';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Target,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const StatCard = ({ title, value, sub, tint, text }) => (
  <div className={`${tint} rounded-2xl p-5 flex flex-col justify-center items-center text-center`}>
    <p className={`text-sm font-medium mb-1 ${text}`}>{title}</p>
    <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
    {sub && <p className={`text-xs mt-1 ${text} opacity-75`}>{sub}</p>}
  </div>
);

export default function FeeOverviewTab({ analytics }) {
  const a = analytics;

  if (!a) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <Wallet size={36} className="mx-auto text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-500">No analytics yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Publish a fee structure to automatically generate invoices and populate finance analytics.
        </p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total expected', value: formatNaira(a.totalExpected),
      sub: `${a.studentsBilled || 0} students billed`,
      tint: 'bg-[#E9F2FC]', text: 'text-blue-800/70',
    },
    {
      title: 'Total collected', value: formatNaira(a.totalCollected),
      sub: `${a.studentsFullyPaid || 0} fully paid`,
      tint: 'bg-[#FBFADE]', text: 'text-amber-800/70',
    },
    {
      title: 'Outstanding', value: formatNaira(a.totalPending),
      sub: `${a.studentsOwing || 0} students owing`,
      tint: 'bg-[#EAFBF0]', text: 'text-emerald-800/70',
    },
    {
      title: 'Collection rate', value: `${(a.collectionRate || 0).toFixed(1)}%`,
      sub: 'of total expected',
      tint: 'bg-[#F5F1FD]', text: 'text-violet-800/70',
    },
  ];

  const miniStats = [
    { label: 'Students Billed',  value: a.studentsBilled || 0,    icon: Users,        color: 'text-blue-600 bg-blue-50' },
    { label: 'Fully Paid',       value: a.studentsFullyPaid || 0, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Owing',            value: a.studentsOwing || 0,     icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  ];

  const maxClassExpected = Math.max(1, ...(a.byClass || []).map(c => c.expected || 0));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.title} {...c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection by class */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Collection by Class</h3>
          {(a.byClass || []).length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No class billing data yet.</p>
          ) : (
            <div className="space-y-4">
              {a.byClass.map(c => {
                const pct = c.expected ? Math.round((c.collected / c.expected) * 100) : 0;
                return (
                  <div key={c.classId || c.className}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{c.className}</span>
                      <span className="text-gray-500">
                        {formatNaira(c.collected)} / {formatNaira(c.expected)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (c.expected / maxClassExpected) * pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side mini stats + method split */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            {miniStats.map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.color}`}>
                  <m.icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">By Payment Method</h3>
            {(a.byMethod || []).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No payments recorded.</p>
            ) : (
              <div className="space-y-2">
                {a.byMethod.map(m => (
                  <div key={m.method} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{m.method.replace('_', ' ')}</span>
                    <span className="font-semibold text-gray-900">{formatNaira(m.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
