/**
 * assessmentEntryAPIs.js — Teacher: Incremental Assessment Entry
 *
 * In the redesigned grading system, teachers record assessments throughout
 * the term rather than entering all scores in one bulk operation at term end.
 *
 * Each "assessment entry" is one assessment event (e.g. "Class Test 1") linked
 * to a policy component (e.g. "1st CA Test"), with a configurable maximum score
 * and a contribution toward that component's total allocation.
 *
 * A component's allocation is fully used when the sum of contributionPoints
 * across all its entries equals the component's maxScore.
 *
 * Live endpoints (backend pending — uncomment apiClient calls when ready):
 *   GET    /api/teacher/assessment-entries?className=&subjectName=&termId=
 *   POST   /api/teacher/assessment-entries
 *   PUT    /api/teacher/assessment-entries/:id
 *   DELETE /api/teacher/assessment-entries/:id
 *   POST   /api/teacher/assessment-entries/:id/scores
 *
 * AssessmentEntry shape:
 * {
 *   id: string,
 *   policyComponentId: string,        // which CA component ('exam' for exam entries)
 *   policyComponentName: string,
 *   componentType: 'ca' | 'exam',
 *   title: string,                     // e.g. "Class Test 1"
 *   assessmentType: string,            // e.g. "Class Test", "Quiz"
 *   className: string,
 *   subjectName: string,
 *   termId: string,
 *   maxObtainableScore: number,        // what the test was marked out of (e.g. 70)
 *   contributionPoints: number,        // how many points this counts toward the component (e.g. 8)
 *   createdBy: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   scores: [{
 *     studentId: string,
 *     studentName: string,
 *     scoreObtained: number,           // raw score (e.g. 52 out of 70)
 *     calculatedContribution: number,  // (scoreObtained / maxObtainableScore) * contributionPoints
 *   }]
 * }
 */

import apiClient from '../../../../utils/axiosConfig.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ASSESSMENT_TYPES = [
    'Class Test',
    'Quiz',
    'Assignment',
    'Homework',
    'Project',
    'Practical',
    'Oral Assessment',
    'Mid-Term Exam',
    'Final Exam',
    'Take-Home',
];

// ─── In-memory mock store ─────────────────────────────────────────────────────

let _nextId = 4;
const _delay = (ms = 320) => new Promise(r => setTimeout(r, ms));

function _calcContrib(score, maxScore, contributionPoints) {
    if (!maxScore || !contributionPoints) return 0;
    return parseFloat(((score / maxScore) * contributionPoints).toFixed(2));
}

function _withCalc(entry) {
    return {
        ...entry,
        scores: entry.scores.map(s => ({
            ...s,
            calculatedContribution: _calcContrib(
                s.scoreObtained,
                entry.maxObtainableScore,
                entry.contributionPoints,
            ),
        })),
    };
}

let _entries = [
    {
        id: 'ae_001',
        policyComponentId: 'tcomp_001',
        policyComponentName: '1st CA Test',
        componentType: 'ca',
        title: 'Class Test 1',
        assessmentType: 'Class Test',
        className: 'SS 2',
        subjectName: 'English Language',
        termId: 'current',
        maxObtainableScore: 70,
        contributionPoints: 8,
        createdBy: 'Kenechukwu Ajufo',
        createdAt: '2026-06-10T09:00:00.000Z',
        updatedAt: '2026-06-10T11:30:00.000Z',
        scores: [
            { studentId: 'std_001', studentName: 'Adaeze Okafor',    scoreObtained: 56 },
            { studentId: 'std_002', studentName: 'Emeka Nwachukwu',  scoreObtained: 49 },
            { studentId: 'std_003', studentName: 'Chidinma Eze',     scoreObtained: 63 },
            { studentId: 'std_004', studentName: 'Tochukwu Obi',     scoreObtained: 42 },
            { studentId: 'std_005', studentName: 'Ngozi Amadi',      scoreObtained: 58 },
            { studentId: 'std_006', studentName: 'Chukwuemeka Igwe', scoreObtained: 35 },
        ],
    },
    {
        id: 'ae_002',
        policyComponentId: 'tcomp_001',
        policyComponentName: '1st CA Test',
        componentType: 'ca',
        title: 'Reading Quiz',
        assessmentType: 'Quiz',
        className: 'SS 2',
        subjectName: 'English Language',
        termId: 'current',
        maxObtainableScore: 20,
        contributionPoints: 7,
        createdBy: 'Kenechukwu Ajufo',
        createdAt: '2026-06-18T09:00:00.000Z',
        updatedAt: '2026-06-18T10:00:00.000Z',
        scores: [
            { studentId: 'std_001', studentName: 'Adaeze Okafor',    scoreObtained: 17 },
            { studentId: 'std_002', studentName: 'Emeka Nwachukwu',  scoreObtained: 14 },
            { studentId: 'std_003', studentName: 'Chidinma Eze',     scoreObtained: 19 },
            { studentId: 'std_004', studentName: 'Tochukwu Obi',     scoreObtained: 11 },
            { studentId: 'std_005', studentName: 'Ngozi Amadi',      scoreObtained: 16 },
            { studentId: 'std_006', studentName: 'Chukwuemeka Igwe', scoreObtained: 9  },
        ],
    },
    {
        id: 'ae_003',
        policyComponentId: 'tcomp_002',
        policyComponentName: '2nd CA Test',
        componentType: 'ca',
        title: 'Take-Home Test',
        assessmentType: 'Take-Home',
        className: 'SS 2',
        subjectName: 'English Language',
        termId: 'current',
        maxObtainableScore: 50,
        contributionPoints: 5,
        createdBy: 'Kenechukwu Ajufo',
        createdAt: '2026-06-20T09:00:00.000Z',
        updatedAt: '2026-06-20T14:00:00.000Z',
        scores: [
            { studentId: 'std_001', studentName: 'Adaeze Okafor',    scoreObtained: 44 },
            { studentId: 'std_002', studentName: 'Emeka Nwachukwu',  scoreObtained: 38 },
            { studentId: 'std_003', studentName: 'Chidinma Eze',     scoreObtained: 47 },
            { studentId: 'std_004', studentName: 'Tochukwu Obi',     scoreObtained: 30 },
            { studentId: 'std_005', studentName: 'Ngozi Amadi',      scoreObtained: 41 },
            { studentId: 'std_006', studentName: 'Chukwuemeka Igwe', scoreObtained: 25 },
        ],
    },
];

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/teacher/assessment-entries?className=&subjectName=&termId=
 *
 * Returns all assessment entries the teacher has recorded for a given
 * class, subject, and term.
 *
 * Response: { data: { entries: AssessmentEntry[] } }
 */
export async function listAssessmentEntries(className, subjectName, termId) {
    try {
        const {data} = await apiClient.get('/api/teacher/assessment-entries', {
            params: {className, subjectName, termId},
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay();
    // // Mock returns all stored entries (production would filter by class/subject/term)
    // return { data: { entries: _entries.map(_withCalc) } };
}

/**
 * POST /api/teacher/assessment-entries
 *
 * Creates a new assessment entry (no scores yet — scores are saved separately).
 *
 * payload: {
 *   policyComponentId: string,
 *   policyComponentName: string,
 *   componentType: 'ca' | 'exam',
 *   title: string,
 *   assessmentType: string,
 *   className: string,
 *   subjectName: string,
 *   termId: string,
 *   maxObtainableScore: number,
 *   contributionPoints: number,
 * }
 *
 * Response: { data: { entry: AssessmentEntry } }
 */
export async function createAssessmentEntry(payload) {
    try {
        const { data } = await apiClient.post('/api/teacher/assessment-entries', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(450);
    // const entry = {
    //     id: `ae_${String(_nextId++).padStart(3, '0')}`,
    //     policyComponentId:   payload.policyComponentId,
    //     policyComponentName: payload.policyComponentName,
    //     componentType:       payload.componentType,
    //     title:               payload.title,
    //     assessmentType:      payload.assessmentType,
    //     className:           payload.className,
    //     subjectName:         payload.subjectName,
    //     termId:              payload.termId,
    //     maxObtainableScore:  Number(payload.maxObtainableScore),
    //     contributionPoints:  Number(payload.contributionPoints),
    //     createdBy:           'Kenechukwu Ajufo',
    //     createdAt:           new Date().toISOString(),
    //     updatedAt:           new Date().toISOString(),
    //     scores:              [],
    // };
    // _entries.push(entry);
    // return { data: { entry: _withCalc(entry) } };
}

/**
 * PUT /api/teacher/assessment-entries/:id
 *
 * Updates an existing assessment entry's metadata (not scores — use saveEntryScores).
 * Can update: title, assessmentType, maxObtainableScore, contributionPoints.
 * Cannot change: policyComponentId, className, subjectName, termId.
 *
 * payload: { title?, assessmentType?, maxObtainableScore?, contributionPoints? }
 *
 * Response: { data: { entry: AssessmentEntry } }
 */
export async function updateAssessmentEntry(entryId, payload) {
    try {
        const { data } = await apiClient.put(`/api/teacher/assessment-entries/${entryId}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(400);
    // const idx = _entries.findIndex(e => e.id === entryId);
    // if (idx === -1) throw new Error('Assessment entry not found.');
    //
    // const updated = {
    //     ..._entries[idx],
    //     ...payload,
    //     maxObtainableScore: payload.maxObtainableScore != null
    //         ? Number(payload.maxObtainableScore)
    //         : _entries[idx].maxObtainableScore,
    //     contributionPoints: payload.contributionPoints != null
    //         ? Number(payload.contributionPoints)
    //         : _entries[idx].contributionPoints,
    //     updatedAt: new Date().toISOString(),
    // };
    // _entries[idx] = updated;
    // return { data: { entry: _withCalc(updated) } };
}

/**
 * DELETE /api/teacher/assessment-entries/:id
 *
 * Permanently removes an assessment entry and all its student scores.
 *
 * Response: { data: { deleted: true } }
 */
export async function deleteAssessmentEntry(entryId) {
    try {
        const { data } = await apiClient.delete(`/api/teacher/assessment-entries/${entryId}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay();
    // const before = _entries.length;
    // _entries = _entries.filter(e => e.id !== entryId);
    // if (_entries.length === before) throw new Error('Assessment entry not found.');
    // return { data: { deleted: true } };
}

/**
 * POST /api/teacher/assessment-entries/:id/scores
 *
 * Saves (or replaces) student scores for an assessment entry.
 * The full scores array must be sent — partial updates are not supported.
 *
 * payload: {
 *   scores: [{
 *     studentId: string,
 *     studentName: string,
 *     scoreObtained: number,       // raw score (0 to maxObtainableScore)
 *   }]
 * }
 *
 * Response: { data: { entry: AssessmentEntry } }
 */
export async function saveEntryScores(entryId, scores) {
    try {
        const { data } = await apiClient.post(
            `/api/teacher/assessment-entries/${entryId}/scores`,
            { scores },
        );
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(380);
    // const entry = _entries.find(e => e.id === entryId);
    // if (!entry) throw new Error('Assessment entry not found.');
    // entry.scores = scores.map(s => ({
    //     studentId:     s.studentId,
    //     studentName:   s.studentName,
    //     scoreObtained: Number(s.scoreObtained) || 0,
    // }));
    // entry.updatedAt = new Date().toISOString();
    // return { data: { entry: _withCalc(entry) } };
}
