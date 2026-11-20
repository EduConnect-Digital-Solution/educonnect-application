/**
 * CSV building shared by every client-side export.
 *
 *  - Text that a spreadsheet would run as a formula (=, +, -, @ at the start, as in
 *    `=HYPERLINK(...)` typed into a name field) is neutralised with a leading apostrophe.
 *    Plain numbers such as -500 or +234 are left alone so sums still work.
 *  - Files start with a UTF-8 byte-order mark so Excel shows ₦ and accented names correctly.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?$/;

/** Stop a spreadsheet from treating user-entered text as a formula. */
export function neutraliseFormula(value) {
    const text = String(value ?? '');
    if (!FORMULA_START.test(text) || PLAIN_NUMBER.test(text.trim())) return text;
    return `'${text}`;
}

/** One quoted CSV cell. */
export function csvCell(value) {
    return `"${neutraliseFormula(value).replace(/"/g, '""')}"`;
}

/** Rows of cells → CSV text (CRLF line endings, as spreadsheets expect). */
export function toCsv(rows) {
    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Save CSV text as a file download. */
export function downloadCsv(filename, csvText) {
    const blob = new Blob(['﻿', csvText], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke after the browser has had time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
