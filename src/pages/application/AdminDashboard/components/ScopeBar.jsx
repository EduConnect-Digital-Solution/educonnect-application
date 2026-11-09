import React from 'react';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';

/**
 * ScopeBar — academic year + term selectors backed by the global AcademicContext.
 * Drop it into any admin page header; it reads/writes the shared scope directly.
 */
export default function ScopeBar() {
  const { academicYears, currentYear, terms, currentTerm, selectYear, selectTerm } = useAcademic();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={currentYear?.id || ''}
        onChange={(e) => selectYear(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {academicYears.length === 0 && <option value="">No academic years</option>}
        {academicYears.map(y => (
          <option key={y.id} value={y.id}>{y.name}{y.isActive ? ' (Active)' : ''}</option>
        ))}
      </select>

      <select
        value={currentTerm?.id || ''}
        onChange={(e) => selectTerm(e.target.value)}
        disabled={terms.length === 0}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
      >
        {terms.length === 0 && <option value="">All terms</option>}
        {terms.map(t => (
          <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? ' (Current)' : ''}</option>
        ))}
      </select>
    </div>
  );
}
