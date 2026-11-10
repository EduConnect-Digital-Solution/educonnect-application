import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileUp, AlertTriangle, Info } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { downloadImportTemplate, importCsv, exportStudentsCsv, exportTeachersCsv } from '../../services/schoolSettingsAPIs.js';
import { notify } from '@/components/patterns/toastBus.js';

const KINDS = {
    students: { title: 'Students', noun: 'students', hint: 'Names, class, arm, date of birth and guardian details. Creates student records only. Nobody is emailed and no logins are made.' },
    staff: { title: 'Teachers', noun: 'teachers', hint: 'Names, email, phone and subjects. Creates teacher records only. A teacher can sign in after you invite them from the People page. Only teachers can be imported, never administrators.' },
};

function Importer({ kind }) {
    const meta = KINDS[kind];
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [check, setCheck] = useState(null);   // dry-run report
    const [done, setDone] = useState(null);     // final report
    const [error, setError] = useState('');

    const reset = () => { setFile(null); setCheck(null); setDone(null); setError(''); if (inputRef.current) inputRef.current.value = ''; };

    const pick = (e) => { const f = e.target.files?.[0]; setCheck(null); setDone(null); setError(''); setFile(f || null); };

    const run = async (dryRun) => {
        setBusy(true); setError('');
        try {
            const report = await importCsv(kind, file, { dryRun });
            if (dryRun) setCheck(report);
            else { setDone(report); setCheck(null); notify.success(`${report.summary.imported} ${meta.noun} imported.`); }
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    };

    const report = done || check;
    const s = report?.summary;

    return (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
            <div>
                <h2 className="text-base font-bold text-gray-900">Import {meta.title.toLowerCase()}</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">{meta.hint}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => downloadImportTemplate(kind).catch((e) => notify.error(e.message))} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Download size={15} /> Download template
                </button>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-dashed border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <FileUp size={15} /> {file ? file.name : 'Choose a CSV file'}
                    <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={pick} />
                </label>
                {file && !done && (
                    <button onClick={() => run(true)} disabled={busy} className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        {busy && !check ? 'Checking…' : 'Check file'}
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-400">CSV only, up to 5 MB and 5,000 rows. Save a spreadsheet as CSV first.</p>

            {error && <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</p>}

            {report && (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm"><b>{s.totalRows}</b> rows</span>
                        <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-800 text-sm"><b>{s.valid}</b> ready</span>
                        {s.invalid > 0 && <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 text-sm"><b>{s.invalid}</b> need fixing</span>}
                        {done && <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-sm"><b>{s.imported}</b> imported</span>}
                    </div>

                    {report.ignoredColumns?.length > 0 && <p className="text-xs text-gray-500 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" />Ignored columns: {report.ignoredColumns.join(', ')}</p>}

                    {report.errors?.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="max-h-56 overflow-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 font-semibold text-gray-500">Row</th><th className="px-3 py-2 font-semibold text-gray-500">Column</th><th className="px-3 py-2 font-semibold text-gray-500">Problem</th></tr></thead>
                                    <tbody>{report.errors.slice(0, 100).map((er, i) => (
                                        <tr key={i} className="border-t border-gray-100"><td className="px-3 py-1.5 tabular-nums">{er.line}</td><td className="px-3 py-1.5">{er.field}</td><td className="px-3 py-1.5 text-red-700">{er.message}</td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                            {(report.errorsTruncated || report.errors.length > 100) && <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">Showing the first problems only. Fix these and check again.</p>}
                        </div>
                    )}
                    {report.warnings?.length > 0 && <p className="text-xs text-amber-700">{report.warnings.length} warning(s), for example: {report.warnings[0].message}</p>}

                    {check && s.valid > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={() => run(false)} disabled={busy} className="px-4 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                                {busy ? 'Importing…' : `Import ${s.valid} ${meta.noun}`}
                            </button>
                            {s.invalid > 0 && <span className="text-xs text-gray-500">The {s.invalid} rows with problems will be skipped.</span>}
                        </div>
                    )}
                    {check && s.valid === 0 && <p className="text-sm text-gray-600">Nothing can be imported yet. Fix the problems above and check the file again.</p>}
                    {done && (
                        <div className="flex items-center gap-3">
                            <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} />Import complete.</p>
                            <button onClick={reset} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Import another file</button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

function ExportCard() {
    const [busy, setBusy] = useState('');
    const go = (key, fn) => async () => {
        setBusy(key);
        try { await fn(); notify.success('Download started. This export is recorded in the audit log.'); } catch (e) { notify.error(e.message); } finally { setBusy(''); }
    };
    return (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
            <div>
                <h2 className="text-base font-bold text-gray-900">Export</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">Download your records as CSV. The files contain personal details of pupils and staff, so keep them safe. Every export is recorded in the audit log.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <button onClick={go('students', exportStudentsCsv)} disabled={!!busy} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={15} />{busy === 'students' ? 'Preparing…' : 'Students (CSV)'}</button>
                <button onClick={go('teachers', exportTeachersCsv)} disabled={!!busy} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={15} />{busy === 'teachers' ? 'Preparing…' : 'Teachers (CSV)'}</button>
            </div>
        </section>
    );
}

export default function DataImportPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Data & Import" />
            <div className="flex flex-col gap-6 max-w-4xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data &amp; Import</h1>
                    <p className="text-sm text-gray-500 mt-1">Bring existing students and teachers in from a spreadsheet, and take your records out. Always check the file first. Nothing is saved until you confirm.</p>
                </div>
                <Importer kind="students" />
                <Importer kind="staff" />
                <ExportCard />
            </div>
        </AdminLayout>
    );
}
