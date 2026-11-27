import test from 'node:test';
import assert from 'node:assert/strict';
import {
    roundPoints, sumPoints, calcContribution, entryContribution,
    findStudentScore, countRosterNames, buildStudentTotals, findTopStudents, rankStudents,
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

test('findTopStudents marks the highest total and every tie', () => {
    assert.deepEqual(findTopStudents([]), []);
    assert.deepEqual(findTopStudents([{ id: 's1', total: 0 }, { id: 's2', total: 0 }]), []);

    const leaders = findTopStudents([
        { id: 's1', fullName: 'Ada Obi', total: 54.5 },
        { id: 's2', fullName: 'Tunde Bello', total: 10 },
        { id: 's3', fullName: 'Bola Eze', total: 54.5 },
    ]);
    assert.deepEqual(leaders.map((s) => s.id), ['s1', 's3']);

    assert.deepEqual(
        findTopStudents([{ id: 's1', total: '12.5' }, { id: 's2', total: 11 }]).map((s) => s.id),
        ['s1'],
    );
    assert.deepEqual(findTopStudents([{ id: 's1' }, { id: 's2', total: null }]), []);
});

test('rankStudents shares ties, skips the next position and keeps roster order', () => {
    const ranked = rankStudents([
        { id: 's1', fullName: 'Ada', total: 50 },
        { id: 's2', fullName: 'Tunde', total: 70 },
        { id: 's3', fullName: 'Bola', total: 70 },
        { id: 's4', fullName: 'Chidi', total: 10, mostRecentAssessment: { title: 'Quiz' } },
        { id: 's5', fullName: 'No Marks', total: 0 },
    ]);

    assert.deepEqual(ranked.map((s) => [s.id, s.position]), [
        ['s2', 1], ['s3', 1], ['s1', 3], ['s4', 4], ['s5', 5],
    ]);
    assert.deepEqual(ranked.map((s) => s.hasScore), [true, true, true, true, false]);
    // The input array is not mutated or reordered.
    assert.equal(ranked.length, 5);
});

test('rankStudents gives every pupil a position when nobody has marks', () => {
    const ranked = rankStudents([{ id: 's1', total: 0 }, { id: 's2', total: 0 }]);
    assert.deepEqual(ranked.map((s) => s.position), [1, 1]);
    assert.deepEqual(ranked.map((s) => s.hasScore), [false, false]);
});
