import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem } from '../src/utils/password.js';

test('passwordProblem reports the first broken rule', () => {
    assert.match(passwordProblem(''), /required/);
    assert.match(passwordProblem('Ab1!'), /at least 8/);
    assert.match(passwordProblem('abcdefg1!'), /uppercase/);
    assert.match(passwordProblem('Abcdefgh!'), /number/);
    assert.match(passwordProblem('Abcdefg12'), /special/);
    assert.equal(passwordProblem('Abcdefg1!'), null);
});
