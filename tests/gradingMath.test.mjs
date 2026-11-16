import test from 'node:test';
import assert from 'node:assert/strict';
import {
    roundPoints, sumPoints, calcContribution, entryContribution,
    findStudentScore, countRosterNames, buildStudentTotals,
} from '../src/pages/application/TeacherDashboard/teacherUtils/gradingMath.js';

test('roundPoints removes binary float drift', () => {
    assert.equal(roundPoints(0.1 + 0.2), 0.3);
    assert.equal(roundPoints(1.005), 1.01);
    assert.equal(roundPoints('abc'), 0);
});

test('sumPoints adds contribution points exactly', () => {
    assert.equal(sumPoints([0.1, 0.2]), 0.3);
    assert.equal(sumPoints([3.3, 3.3, 3.4]), 10);
    assert.equal(sumPoints([]), 0);
});

test('calcContribution weights a raw score', () => {
    assert.equal(calcContribution(15, 20, 10), 7.5);
    assert.equal(calcContribution(52, 70, 8), 5.94);
    assert.equal(calcContribution(0, 20, 10), 0);
    assert.equal(calcContribution('', 20, 10), null);
    assert.equal(calcContribution(5, 0, 10), null);
    assert.equal(calcContribution(-1, 20, 10), null);
});

test('entryContribution falls back to the served figure', () => {
    assert.equal(entryContribution({ maxObtainableScore: 20, contributionPoints: 10 }, { scoreObtained: 15 }), 7.5);
    assert.equal(entryContribution({}, { scoreObtained: 15, calculatedContribution: 4.25 }), 4.25);
    assert.equal(entryContribution({ maxObtainableScore: 20, contributionPoints: 10 }, { scoreObtained: null }), null);
    assert.equal(entryContribution({ maxObtainableScore: 20, contributionPoints: 10 }, undefined), null);
});

test('findStudentScore never gives a namesake another student\'s score', () => {
    const roster = [
        { id: 's1', fullName: 'Ada Obi' },
        { id: 's2', fullName: 'Ada Obi' },
        { id: 's3', fullName: 'Tunde Bello' },
    ];
    const counts = countRosterNames(roster);
    const entry = { scores: [
        { studentId: 's1', studentName: 'Ada Obi', scoreObtained: 18 },
        { studentName: 'Tunde Bello', scoreObtained: 9 },          // legacy row without an id
        { studentName: 'Ada Obi', scoreObtained: 3 },              // legacy row, ambiguous name
    ] };
    assert.equal(findStudentScore(entry, roster[0], counts).scoreObtained, 18);
    assert.equal(findStudentScore(entry, roster[1], counts), undefined);
    assert.equal(findStudentScore(entry, roster[2], counts).scoreObtained, 9);
});

test('buildStudentTotals weights every score before adding it up', () => {
    const policy = { caComponents: [{ id: 'ca1', name: 'CA 1', maxScore: 20 }, { id: 'ca2', name: 'CA 2', maxScore: 20 }], examMax: 60 };
    const students = [{ id: 's1', fullName: 'Ada Obi' }, { id: 's2', fullName: 'Tunde Bello' }];
    const entries = [
        { id: 'e1', title: 'Test 1', policyComponentId: 'ca1', componentType: 'ca', maxObtainableScore: 20, contributionPoints: 10, createdAt: '2026-01-10T09:00:00Z',
            scores: [{ studentId: 's1', scoreObtained: 15 }, { studentId: 's2', scoreObtained: 20 }] },
        { id: 'e2', title: 'Quiz', policyComponentId: 'ca1', componentType: 'ca', maxObtainableScore: 50, contributionPoints: 10, createdAt: '2026-02-10T09:00:00Z',
            scores: [{ studentId: 's1', scoreObtained: 25 }] },
        { id: 'e3', title: 'Exam', policyComponentId: 'exam', componentType: 'exam', maxObtainableScore: 100, contributionPoints: 60, createdAt: '2026-03-10T09:00:00Z',
            scores: [{ studentId: 's1', scoreObtained: 70 }] },
    ];
    const [ada, tunde] = buildStudentTotals(students, entries, policy);
    // 15/20×10 = 7.5, 25/50×10 = 5, 70/100×60 = 42
    assert.deepEqual(ada.scores, { ca1: 12.5, ca2: 0, exam: 42 });
    assert.equal(ada.total, 54.5);
    assert.equal(ada.mostRecentAssessment.title, 'Exam');
    assert.deepEqual(tunde.scores, { ca1: 10, ca2: 0, exam: 0 });
    assert.equal(tunde.total, 10);
    // A total can never exceed the points on offer
    assert.ok(ada.total <= 100 && tunde.total <= 100);
});
