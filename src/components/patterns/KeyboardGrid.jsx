import React, { useRef, useCallback } from 'react';

/**
 * KeyboardGrid — spreadsheet-style keyboard navigation for repetitive data
 * entry (score sheets, attendance registers).
 *
 * Never: open modal → edit → save → close → repeat.
 * Instead: arrows move, Tab moves right, Enter advances down, type in place.
 *
 * Usage:
 *   const grid = useKeyboardGrid();
 *   <div {...grid.containerProps}>
 *     <input {...grid.cellProps(rowIndex, colIndex)} … />
 *   </div>
 *
 * Cells register themselves via data attributes; the container handles keys.
 * Paste support: pass onPasteRows(rows: string[][], startRow, startCol) to
 * receive tab/newline-separated clipboard data (e.g. pasted from Excel).
 */
export function useKeyboardGrid({ onPasteRows } = {}) {
    const containerRef = useRef(null);

    const focusCell = useCallback((row, col) => {
        const el = containerRef.current?.querySelector(
            `[data-kg-row="${row}"][data-kg-col="${col}"]`
        );
        if (el) {
            el.focus();
            if (typeof el.select === 'function') el.select();
            return true;
        }
        return false;
    }, []);

    const handleKeyDown = useCallback((e) => {
        const t = e.target;
        const row = Number(t.dataset?.kgRow);
        const col = Number(t.dataset?.kgCol);
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        let next = null;
        switch (e.key) {
            case 'ArrowDown': next = [row + 1, col]; break;
            case 'ArrowUp':   next = [row - 1, col]; break;
            case 'ArrowRight':
                // only leave the cell when the caret is at the end
                if (t.selectionStart == null || t.selectionStart >= (t.value?.length ?? 0)) next = [row, col + 1];
                break;
            case 'ArrowLeft':
                if (t.selectionStart == null || t.selectionStart <= 0) next = [row, col - 1];
                break;
            case 'Enter':
                next = e.shiftKey ? [row - 1, col] : [row + 1, col];
                break;
            default: return;
        }
        if (next && focusCell(next[0], next[1])) {
            e.preventDefault();
        }
    }, [focusCell]);

    const handlePaste = useCallback((e) => {
        if (!onPasteRows) return;
        const t = e.target;
        const row = Number(t.dataset?.kgRow);
        const col = Number(t.dataset?.kgCol);
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (!text.includes('\t') && !text.includes('\n')) return; // single value — default paste

        e.preventDefault();
        const rows = text
            .replace(/\r/g, '')
            .split('\n')
            .filter(line => line.length > 0)
            .map(line => line.split('\t'));
        onPasteRows(rows, row, col);
    }, [onPasteRows]);

    return {
        focusCell,
        containerProps: {
            ref: containerRef,
            onKeyDown: handleKeyDown,
            onPaste: handlePaste,
        },
        cellProps: (row, col) => ({
            'data-kg-row': row,
            'data-kg-col': col,
        }),
    };
}

/** Standard cell input styling for grids. */
export const gridCellClass =
    'w-full px-2 py-1.5 text-sm text-center border border-transparent rounded ' +
    'focus:border-blue-400 focus:bg-blue-50/40 outline-none transition-colors';

export default useKeyboardGrid;
