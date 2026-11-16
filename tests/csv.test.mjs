import test from 'node:test';
import assert from 'node:assert/strict';
import { neutraliseFormula, csvCell, toCsv } from '../src/utils/csv.js';

test('text that a spreadsheet would run as a formula is neutralised', () => {
    assert.equal(neutraliseFormula('=HYPERLINK("http://x","y")'), '\'=HYPERLINK("http://x","y")');
    assert.equal(neutraliseFormula('+cmd|calc'), "'+cmd|calc");
    assert.equal(neutraliseFormula('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(neutraliseFormula('-2+3'), "'-2+3");
});

test('ordinary values and plain numbers are untouched', () => {
    assert.equal(neutraliseFormula('Ada Obi'), 'Ada Obi');
    assert.equal(neutraliseFormula(-500), '-500');
    assert.equal(neutraliseFormula('+234'), '+234');
    assert.equal(neutraliseFormula('12.50'), '12.50');
    assert.equal(neutraliseFormula(null), '');
});

test('cells are quoted and quotes doubled', () => {
    assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
    assert.equal(csvCell('a,b'), '"a,b"');
});

test('toCsv joins rows with CRLF', () => {
    assert.equal(toCsv([['Name', 'Due'], ['Ada', 1500]]), '"Name","Due"\r\n"Ada","1500"');
});
