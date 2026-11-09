// import apiClient from '../../../../utils/axiosConfig.js';
//
// // Re-export existing teacher APIs so ScoreEntryPage has one import for everything
// export {
//     getTeacherClasses,
//     getSubjectsByClass,
//     getStudentsByClassandSubject,
// } from '../../../auth/authAPIs.js';
//
// /**
//  * GET /api/teacher/effective-policy?className=JSS1&subjectName=Mathematics
//  *
//  * Returns the most specific Assessment Policy that covers this class/subject pair.
//  * The backend resolves scope priority automatically:
//  *   subject_class > subject > arm > class > school (default)
//  *
//  * Returns policy: null when no policy has been assigned at any scope level.
//  *
//  * Expected response:
//  * {
//  *   success: true,
//  *   data: {
//  *     policy: {
//  *       id: string,
//  *       name: string,
//  *       caComponents: [{ id, name, maxScore, sortOrder }],
//  *       caMax: number,   // sum of caComponents.maxScore
//  *       examMax: number,
//  *     } | null
//  *   }
//  * }
//  */
// export async function getEffectivePolicy(className, subjectName) {
//     // MOCK — backend endpoint not yet implemented
//     try {
//         const { data } = await apiClient.get('/api/teacher/effective-policy', {
//             params: { className, subjectName },
//         });
//         return data;
//     } catch (error) {
//         throw error?.response?.data || error;
//     }
// }
//
// /**
//  * GET /api/teacher/score-sheets?className=...&subjectName=...&termId=...
//  *
//  * Returns the existing score sheet for this class/subject/term, or null.
//  * Expected response:
//  * {
//  *   success: true,
//  *   data: {
//  *     sheet: {
//  *       id: string,
//  *       status: 'draft' | 'submitted' | 'returned' | 'approved',
//  *       returnNote: string | null,
//  *       entries: [{
//  *         studentId: string,
//  *         caScores: { [componentId]: number },
//  *         examScore: number,
//  *       }],
//  *       submittedAt: string | null,
//  *       updatedAt: string,
//  *     } | null
//  *   }
//  * }
//  */
// export async function getScoreSheet(className, subjectName, termId) {
//     // MOCK
//     // try {
//     //     const { data } = await apiClient.get('/api/teacher/score-sheets', {
//     //         params: { className, subjectName, termId },
//     //     });
//     //     return data;
//     // } catch (error) {
//     //     throw error?.response?.data || error;
//     // }
//     return { success: true, data: { sheet: null } };
// }
//
// /**
//  * POST /api/teacher/score-sheets
//  * Creates a new score sheet with status 'draft'.
//  *
//  * payload: { className: string, subjectName: string, termId: string }
//  * Response: { success, data: { sheet: { id, status: 'draft', entries: [], returnNote: null } } }
//  */
// export async function createScoreSheet(payload) {
//     // MOCK
//     // try {
//     //     const { data } = await apiClient.post('/api/teacher/score-sheets', payload);
//     //     return data;
//     // } catch (error) {
//     //     throw error?.response?.data || error;
//     // }
//     const sheet = {
//         id: `sheet_${Date.now()}`,
//         status: 'draft',
//         entries: [],
//         returnNote: null,
//         className:   payload.className,
//         subjectName: payload.subjectName,
//         termId:      payload.termId,
//         updatedAt:   new Date().toISOString(),
//     };
//     return { success: true, data: { sheet } };
// }
//
// /**
//  * PUT /api/teacher/score-sheets/:sheetId
//  * Saves the current entries as a draft. Does NOT change status.
//  *
//  * payload: {
//  *   entries: [{
//  *     studentId: string,
//  *     caScores: { [componentId]: number },  // key = caComponent.id
//  *     examScore: number,
//  *   }]
//  * }
//  * Response: { success, data: { sheet: { id, status, updatedAt } } }
//  */
// export async function saveScoreEntries(sheetId, entries) {
//     // MOCK
//     // try {
//     //     const { data } = await apiClient.put(`/api/teacher/score-sheets/${sheetId}`, { entries });
//     //     return data;
//     // } catch (error) {
//     //     throw error?.response?.data || error;
//     // }
//     return {
//         success: true,
//         data: { sheet: { id: sheetId, status: 'draft', updatedAt: new Date().toISOString() } },
//     };
// }
//
// /**
//  * POST /api/teacher/score-sheets/:sheetId/submit
//  * Transitions the sheet from 'draft' (or 'returned') → 'submitted' for admin review.
//  * Backend should validate that no entry has scores exceeding policy limits.
//  *
//  * Response: { success, data: { sheet: { id, status: 'submitted', submittedAt: string } } }
//  */
// export async function submitScoreSheet(sheetId) {
//     // MOCK
//     // try {
//     //     const { data } = await apiClient.post(`/api/teacher/score-sheets/${sheetId}/submit`);
//     //     return data;
//     // } catch (error) {
//     //     throw error?.response?.data || error;
//     // }
//     return {
//         success: true,
//         data: { sheet: { id: sheetId, status: 'submitted', submittedAt: new Date().toISOString() } },
//     };
// }
