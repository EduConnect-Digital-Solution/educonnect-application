import apiClient from '../../../../utils/axiosConfig.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Grading APIs
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LIVE ENDPOINTS
 *   /api/admin/grading-scales          — full CRUD + band sub-resource management
 *   /api/admin/assessment-policies     — list + create (GET/POST only)
 *   /api/admin/submissions/matrix      — term-wide arm × subject status grid
 *   /api/admin/submissions/:id/approve — approve a submitted sheet
 *   /api/admin/submissions/:id/return  — return a submitted sheet to the teacher
 *   /api/admin/broadsheets             — master broadsheet (arm × term)
 *   /api/admin/results/*               — publish status, publish, PDF generation
 *   /api/admin/report-cards/*          — template, comments, generate, sign-off, publish
 *
 * STILL MOCKED  (in-memory; awaiting backend endpoints)
 *   PUT    /api/admin/assessment-policies/:id           — update policy
 *   DELETE /api/admin/assessment-policies/:id           — delete policy
 *   POST   /api/admin/assessment-policies/:id/assignments — add scope assignment
 *   DELETE /api/admin/assessment-policies/:id/assignments/:aId — remove assignment
 *
 * BAND SCHEMA:
 *   { label: string, minPercent: number, maxPercent: number,
 *     gradePoints: number, sortOrder: number }
 *
 * Note: PUT /grading-scales/:id only updates name/description.
 *       Bands are managed exclusively via the /bands sub-endpoints.
 */

// ═════════════════════════════════════════════════════════════════════════════
// GRADING SCALES — LIVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/grading-scales
 * Returns all grading scales for this school.
 *
 * Expected response shape:
 * { success, data: [{ id, name, description, isDefault, bands: [...] }] }
 * Note: data is a flat array (not wrapped in a key).
 */
export async function listGradingScales() {
    try {
        const { data } = await apiClient.get('/api/admin/grading-scales');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * POST /api/admin/grading-scales
 * Creates a new grading scale with its initial band set in a single call.
 *
 * payload: {
 *   name: string,
 *   description?: string,
 *   bands: [{ label, minPercent, maxPercent, gradePoints, sortOrder }]
 * }
 *
 * Expected response shape:
 * { success, data: { gradingScale: { id, name, description, isDefault, bands } } }
 */
export async function createGradingScale(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/grading-scales', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * GET /api/admin/grading-scales/:id
 * Returns full detail for one grading scale, including all bands.
 *
 * Expected response shape:
 * { success, data: { gradingScale: { id, name, description, isDefault, bands } } }
 */
export async function getGradingScale(id) {
    try {
        const { data } = await apiClient.get(`/api/admin/grading-scales/${id}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * PUT /api/admin/grading-scales/:id
 * Updates the scale's name and/or description only.
 * Bands are managed via the /bands sub-endpoints.
 *
 * payload: { name?: string, description?: string }
 *
 * Expected response shape:
 * { success, data: { gradingScale: { id, name, description, isDefault } } }
 */
export async function updateGradingScale(id, payload) {
    try {
        const { data } = await apiClient.put(`/api/admin/grading-scales/${id}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * DELETE /api/admin/grading-scales/:id
 * Deletes a grading scale. Backend should reject with 409 if the scale is
 * currently assigned to any class or arm.
 *
 * Expected response shape:
 * { success, message }
 */
export async function deleteGradingScale(id) {
    try {
        const { data } = await apiClient.delete(`/api/admin/grading-scales/${id}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * POST /api/admin/grading-scales/:id/set-default
 * Marks this scale as the school-wide default. Only one scale can be default
 * at a time — the backend unsets the previous default automatically.
 *
 * Expected response shape:
 * { success, data: { gradingScale: { id, isDefault: true } } }
 */
export async function setDefaultGradingScale(id) {
    try {
        const { data } = await apiClient.post(`/api/admin/grading-scales/${id}/set-default`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// ── Band sub-resource ─────────────────────────────────────────────────────────

/**
 * POST /api/admin/grading-scales/:scaleId/bands
 * Adds a single new band to an existing scale.
 *
 * payload: { label, minPercent, maxPercent, gradePoints, sortOrder }
 *
 * Expected response shape:
 * { success, data: { band: { id, label, minPercent, maxPercent, gradePoints, sortOrder } } }
 */
export async function addGradeBand(scaleId, payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/grading-scales/${scaleId}/bands`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * PUT /api/admin/grading-scales/:scaleId/bands/:bandId
 * Updates a single band's properties.
 *
 * payload: { label?, minPercent?, maxPercent?, gradePoints?, sortOrder? }
 *
 * Expected response shape:
 * { success, data: { band: { id, label, minPercent, maxPercent, gradePoints, sortOrder } } }
 */
export async function updateGradeBand(scaleId, bandId, payload) {
    try {
        const { data } = await apiClient.put(
            `/api/admin/grading-scales/${scaleId}/bands/${bandId}`,
            payload,
        );
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * DELETE /api/admin/grading-scales/:scaleId/bands/:bandId
 * Removes a single band from a scale.
 *
 * Expected response shape:
 * { success, message }
 */
export async function deleteGradeBand(scaleId, bandId) {
    try {
        const { data } = await apiClient.delete(
            `/api/admin/grading-scales/${scaleId}/bands/${bandId}`,
        );
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ASSESSMENT POLICIES — MOCKED (backend endpoints pending)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/assessment-policies
 *
 * Assessment policies define how marks are structured per assessment cycle.
 * Each policy has:
 *   - caComponents: the named CA components (Test 1 = 10, Assignment = 10, …) teachers fill in
 *   - examMax: the total marks allocated to the final exam
 *   - caMax: computed server-side as sum(caComponents.maxScore)
 *   - total: always caMax + examMax (must equal 100)
 *   - assignments: where this policy applies (school-wide, class, arm, subject, or subject×class)
 *
 * Assignment scope priority (most specific wins):
 *   subject_class > subject > arm > class > school
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     policies: [{
 *       id: string,
 *       name: string,
 *       description: string | null,
 *       caComponents: [{ id, name, maxScore, sortOrder }],
 *       caMax: number,    // sum of caComponents.maxScore
 *       examMax: number,
 *       total: number,    // caMax + examMax
 *       assignments: [{
 *         id: string,
 *         scope: 'school' | 'class' | 'arm' | 'subject' | 'subject_class',
 *         scopeId: string | null,
 *         scopeName: string | null,
 *         secondaryScopeId: string | null,   // subjectId when scope = 'subject_class'
 *         secondaryScopeName: string | null,
 *       }],
 *       createdAt: string,
 *       updatedAt: string,
 *     }]
 *   }
 * }
 */
export async function listAssessmentPolicies() {
    try {
        const { data } = await apiClient.get('/api/admin/assessment-policies');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * POST /api/admin/assessment-policies
 *
 * payload: {
 *   name: string,
 *   description?: string,
 *   caComponents: [{ name: string, maxScore: number, sortOrder: number }],
 *   examMax: number,
 * }
 *
 * Expected response shape:
 * { success: true, data: { policy: { ...fullPolicyObject } } }
 */
export async function createAssessmentPolicy(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/assessment-policies', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // const caMax = (payload.caComponents ?? []).reduce((sum, c) => sum + Number(c.maxScore || 0), 0);
    // const policy = {
    //     id: `policy_${Date.now()}`,
    //     name: payload.name,
    //     description: payload.description ?? null,
    //     caComponents: (payload.caComponents ?? []).map((c, i) => ({
    //         id: `comp_${Date.now()}_${i}`,
    //         name: c.name,
    //         maxScore: Number(c.maxScore),
    //         sortOrder: c.sortOrder ?? i,
    //     })),
    //     caMax,
    //     examMax: Number(payload.examMax),
    //     total: caMax + Number(payload.examMax),
    //     assignments: [],
    //     createdAt: new Date().toISOString(),
    //     updatedAt: new Date().toISOString(),
    // };
    // return { success: true, data: { policy } };
}

/**
 * PUT /api/admin/assessment-policies/:id
 *
 * payload: {
 *   name?: string,
 *   description?: string,
 *   caComponents?: [{ name: string, maxScore: number, sortOrder: number }],
 *   examMax?: number,
 * }
 *
 * Expected response shape:
 * { success: true, data: { policy: { ...updatedPolicyObject } } }
 */
export async function updateAssessmentPolicy(id, payload) {
    // MOCK — replace with live call when backend is ready:
    try {
        const { data } = await apiClient.put(`/api/admin/assessment-policies/${id}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * DELETE /api/admin/assessment-policies/:id
 * Backend must reject with 409 Conflict if the policy has active assignments.
 *
 * Expected response shape:
 * { success: true, message: string }
 */
export async function deleteAssessmentPolicy(id) {
    // MOCK — replace with live call when backend is ready:
    try {
        const { data } = await apiClient.delete(`/api/admin/assessment-policies/${id}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // return { success: true, message: 'Policy deleted.' };
}

/**
 * POST /api/admin/assessment-policies/:id/assignments
 * Adds a single scoped assignment to a policy.
 * Use scope = 'school' to set this as the school-wide default.
 *
 * payload: {
 *   scope: 'school' | 'class' | 'arm' | 'subject' | 'subject_class',
 *   scopeId?: string,           // classId / armId / subjectId (null for 'school')
 *   scopeName?: string,         // display name for the selected entity
 *   secondaryScopeId?: string,  // subjectId when scope = 'subject_class'
 *   secondaryScopeName?: string,
 * }
 *
 * Expected response shape:
 * { success: true, data: { assignment: { id, scope, scopeId, scopeName, ... } } }
 */
export async function addPolicyAssignment(policyId, payload) {
    // MOCK — replace with live call when backend is ready:
    try {
        const { data } = await apiClient.post(`/api/admin/assessment-policies/${policyId}/assignments`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * DELETE /api/admin/assessment-policies/:id/assignments/:assignmentId
 * Removes a single assignment from the policy.
 *
 * Expected response shape:
 * { success: true, message: string }
 */
export async function removePolicyAssignment(policyId, assignmentId) {
    // MOCK — replace with live call when backend is ready:
    try {
        const { data } = await apiClient.delete(
            `/api/admin/assessment-policies/${policyId}/assignments/${assignmentId}`
        );
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// SUBMISSION MATRIX & MODERATION — LIVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/submissions/matrix?termId={termId}
 *
 * Returns a term-wide grid: every arm as a row, every subject as a column.
 * Cells show the score-sheet status for that arm × subject pair.
 * Only arms and subjects that are configured in the backend appear.
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     termId: string,
 *     summary: {
 *       total: number,
 *       approved: number, submitted: number, draft: number,
 *       returned: number, not_started: number,
 *     },
 *     subjectList: [{ id: string, name: string }],
 *     matrix: [{
 *       armId: string,
 *       armName: string,
 *       className: string,
 *       subjects: [{
 *         subjectId: string,
 *         subjectName: string,
 *         sheetId: string | null,
 *         status: 'not_started' | 'draft' | 'submitted' | 'returned' | 'approved',
 *         teacherName: string | null,
 *         updatedAt: string | null,
 *       }]
 *     }]
 *   }
 * }
 */
export async function getSubmissionMatrix(termId) {
    try {
        const { data } = await apiClient.get('/api/admin/submissions/matrix', {
            params: { termId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/admin/submissions/:submissionId/approve
 * Transitions a submitted score sheet to 'approved'. Locks it for editing.
 *
 * Expected response shape:
 * { success: true, data: { sheet: { id, status: 'approved', approvedAt: string } } }
 */
export async function approveSubmission(submissionId) {
    try {
        const { data } = await apiClient.post(`/api/admin/submissions/${submissionId}/approve`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/admin/submissions/:submissionId/return
 * Transitions a submitted score sheet back to 'returned' so the teacher can revise.
 * An optional note is delivered to the teacher on their score-entry page.
 *
 * payload: { note?: string }
 *
 * Expected response shape:
 * { success: true, data: { sheet: { id, status: 'returned', returnNote: string } } }
 */
export async function returnSubmission(submissionId, payload = {}) {
    try {
        const { data } = await apiClient.post(
            `/api/admin/submissions/${submissionId}/return`,
            payload,
        );
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

// ═════════════════════════════════════════════════════════════════════════════
// MASTER BROADSHEET — LIVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/broadsheets?armId={armId}&termId={termId}
 *
 * Returns the consolidated results grid for one arm in one term: every student's
 * per-subject CA/Exam/Total/Grade plus right-side aggregates (total, average,
 * class position, grade-point average).
 *
 * The backend MUST only return a populated broadsheet when every score sheet for
 * the arm/term is approved. While sheets are still pending, return
 * `readiness.allApproved = false` and a `readiness.pending` list so the UI can
 * show a blocking banner instead of a half-baked sheet.
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     armId, armName, className, termId, termName,
 *     readiness: {
 *       allApproved: boolean,
 *       total: number, approved: number,
 *       pending: [{ subjectName, status }],
 *     },
 *     subjects: [{ id, name }],
 *     students: [{
 *       id, name, admissionNo,
 *       scores: { [subjectId]: { ca, exam, total, grade } },
 *       totalScore, average, gradePointAverage, position,
 *     }],
 *   }
 * }
 *
 * Backend note: aggregating 100 students × 12 subjects per request will bottleneck.
 * Build a materialised view (or aggregation job triggered on sheet approval).
 */
export async function getBroadsheet(armId, termId) {
    try {
        const { data } = await apiClient.get('/api/admin/broadsheets', {
            params: { armId, termId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

// ═════════════════════════════════════════════════════════════════════════════
// RESULT PUBLISHING — LIVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/results/publish-status?termId={termId}&classId={classId}
 *
 * Returns whether results are already published for this term/class, plus the
 * pre-publish checklist the UI gates the Publish button on.
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     published: boolean,
 *     publishedAt: string | null,
 *     checklist: {
 *       allApproved:     { passed, label, detail },
 *       schemesAssigned: { passed, label, detail },
 *       termDatesSet:    { passed, label, detail },
 *     }
 *   }
 * }
 */
export async function getPublishStatus(termId, classId) {
    try {
        const { data } = await apiClient.get('/api/admin/results/publish-status', {
            params: { termId, classId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    //
}

/**
 * POST /api/admin/results/publish
 * Locks all grades for the term/class and makes results eligible for report cards.
 *
 * payload: { termId, classId }
 * Response: { success, data: { published: true, publishedAt: string } }
 */
export async function publishResults(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/results/publish', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/admin/results/generate-pdfs
 * Kicks off async bulk PDF generation. Returns a job id to poll.
 *
 * payload: { termId, classId }
 * Response: { success, data: { jobId: string } }
 */
export async function generateResultPdfs(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/results/generate-pdfs', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * GET /api/admin/results/pdf-jobs/:jobId
 * Poll for bulk-PDF progress. The frontend polls until status = 'completed'.
 *
 * Response: { success, data: { jobId, status: 'processing'|'completed'|'failed', progress, downloadUrl } }
 */
export async function getPdfJob(jobId) {
    try {
        const { data } = await apiClient.get(`/api/admin/results/pdf-jobs/${jobId}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    //
}

// ═════════════════════════════════════════════════════════════════════════════
// REPORT CARDS — LIVE
// ═════════════════════════════════════════════════════════════════════════════

export const REPORT_CARD_TRAITS = ['Punctuality', 'Conduct', 'Neatness', 'Participation', 'Leadership'];

/**
 * GET /api/admin/report-cards/template
 * Returns the saved report-card layout for this school (or the default).
 *
 * Expected response shape:
 * { success, data: { template: { orientation, accent, blocks: [{ id, type, label, enabled }] } } }
 */
export async function getReportCardTemplate() {
    try {
        const { data } = await apiClient.get('/api/admin/report-cards/template');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * PUT /api/admin/report-cards/template
 * Persists the report-card layout.
 *
 * payload: { orientation, accent, blocks: [{ id, type, label, enabled }] }
 * Response: { success, data: { template } }
 */
export async function saveReportCardTemplate(payload) {
    try {
        const { data } = await apiClient.put('/api/admin/report-cards/template', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * GET /api/admin/report-cards/comments?armId={armId}&termId={termId}
 * Returns the class-teacher comment worklist for an arm: one row per student with
 * their saved personal comment, trait ratings (1–5), and completion status.
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     traits: string[],
 *     students: [{ id, name, admissionNo, comment, traits: { [trait]: number }, status: 'pending'|'completed' }]
 *   }
 * }
 */
export async function getReportCardComments(armId, termId) {
    try {
        const { data } = await apiClient.get('/api/admin/report-cards/comments', {
            params: { armId, termId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * PUT /api/admin/report-cards/comments/:studentId
 * Saves a single student's class-teacher comment and trait ratings.
 *
 * payload: { armId, termId, comment, traits: { [trait]: number } }
 * Response: { success, data: { studentId, status: 'completed' } }
 */
export async function saveReportCardComment(studentId, payload) {
    try {
        const { data } = await apiClient.put(`/api/admin/report-cards/comments/${studentId}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/admin/report-cards/generate
 * Generates report-card PDFs for an arm/term (async job, same polling contract
 * as result PDFs — poll getPdfJob).
 *
 * payload: { armId, termId }
 * Response: { success, data: { jobId } }
 */
export async function generateReportCards(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/report-cards/generate', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/admin/report-cards/sign-off
 * Principal bulk sign-off for an arm/term's generated cards.
 *
 * payload: { armId, termId }
 * Response: { success, data: { signedOff: true, signedAt: string } }
 */
export async function signOffReportCards(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/report-cards/sign-off', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * POST /api/admin/report-cards/publish
 * Releases signed-off cards to the parent portal (individual or bulk).
 *
 * payload: { armId, termId, studentIds?: string[] }   // omit studentIds for whole-arm
 * Response: { success, data: { publishedCount: number, publishedAt: string } }
 */
export async function publishReportCardsToParents(payload) {
    try {
        const { data } = await apiClient.post('/api/admin/report-cards/publish', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

// ═════════════════════════════════════════════════════════════════════════════
// GRADING ACTIVITY AUDIT — MOCKED (new endpoint; backend pending)
// ═════════════════════════════════════════════════════════════════════════════

const _auditDelay = (ms = 280) => new Promise(r => setTimeout(r, ms));

/**
 * GET /api/admin/grading-activity?className=&armName=&subjectName=&termId=
 *
 * NEW endpoint replacing the old approve/return moderation workflow.
 * Admin reads grading progress for a given class arm × subject × term.
 * No moderation actions — admin is a read-only auditor of teacher grading.
 *
 * Expected response shape:
 * {
 *   success: true,
 *   data: {
 *     className: string,
 *     armName: string,
 *     subjectName: string,
 *     termId: string,
 *     teacherName: string | null,
 *     lastUpdated: string | null,
 *     policy: {
 *       name: string,
 *       caComponents: [{ id, name, maxScore }],
 *       examMax: number,
 *     } | null,
 *     componentProgress: [{
 *       componentId: string,
 *       componentName: string,
 *       maxScore: number,
 *       usedPoints: number,    // sum of contributionPoints across all entries for this component
 *       entries: number,       // count of assessment entries
 *     }],
 *     entries: [{
 *       id: string,
 *       title: string,
 *       assessmentType: string,
 *       componentName: string,
 *       componentId: string,
 *       contributionPoints: number,
 *       studentsGraded: number,
 *       createdAt: string,
 *       updatedAt: string,
 *     }],
 *     overallStatus: 'not_started' | 'in_progress' | 'completed',
 *   }
 * }
 */
export async function getSubjectGradingActivity(className, armName, subjectName, termId) {
    try {
        const { data } = await apiClient.get('/api/admin/grading-activity', {
            params: { className, armName, subjectName, termId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _auditDelay();
    // return {
    //     data: {
    //         className,
    //         armName,
    //         subjectName,
    //         termId,
    //         teacherName: 'Kenechukwu Ajufo',
    //         lastUpdated: '2026-06-20T14:00:00.000Z',
    //         policy: {
    //             name: 'SS 2 Standard (40 CA / 60 Exam)',
    //             caComponents: [
    //                 { id: 'tcomp_001', name: '1st CA Test',  maxScore: 15 },
    //                 { id: 'tcomp_002', name: '2nd CA Test',  maxScore: 15 },
    //                 { id: 'tcomp_003', name: 'Project Work', maxScore: 10 },
    //             ],
    //             examMax: 60,
    //         },
    //         componentProgress: [
    //             { componentId: 'tcomp_001', componentName: '1st CA Test',  maxScore: 15, usedPoints: 15, entries: 2 },
    //             { componentId: 'tcomp_002', componentName: '2nd CA Test',  maxScore: 15, usedPoints: 5,  entries: 1 },
    //             { componentId: 'tcomp_003', componentName: 'Project Work', maxScore: 10, usedPoints: 0,  entries: 0 },
    //             { componentId: 'exam',      componentName: 'Exam',         maxScore: 60, usedPoints: 0,  entries: 0 },
    //         ],
    //         entries: [
    //             {
    //                 id:                 'ae_001',
    //                 title:              'Class Test 1',
    //                 assessmentType:     'Class Test',
    //                 componentName:      '1st CA Test',
    //                 componentId:        'tcomp_001',
    //                 contributionPoints: 8,
    //                 studentsGraded:     6,
    //                 createdAt:          '2026-06-10T09:00:00.000Z',
    //                 updatedAt:          '2026-06-10T11:30:00.000Z',
    //             },
    //             {
    //                 id:                 'ae_002',
    //                 title:              'Reading Quiz',
    //                 assessmentType:     'Quiz',
    //                 componentName:      '1st CA Test',
    //                 componentId:        'tcomp_001',
    //                 contributionPoints: 7,
    //                 studentsGraded:     6,
    //                 createdAt:          '2026-06-18T09:00:00.000Z',
    //                 updatedAt:          '2026-06-18T10:00:00.000Z',
    //             },
    //             {
    //                 id:                 'ae_003',
    //                 title:              'Take-Home Test',
    //                 assessmentType:     'Take-Home',
    //                 componentName:      '2nd CA Test',
    //                 componentId:        'tcomp_002',
    //                 contributionPoints: 5,
    //                 studentsGraded:     6,
    //                 createdAt:          '2026-06-20T09:00:00.000Z',
    //                 updatedAt:          '2026-06-20T14:00:00.000Z',
    //             },
    //         ],
    //         overallStatus: 'in_progress',
    //     },
    // };
}

/**
 * GET /api/admin/grading/subject-scores
 */
export async function getAdminSubjectScores(termId, className, armName, subjectName) {
    try {
        const { data } = await apiClient.get('/api/admin/grading/subject-scores', {
            params: { termId, className, armName, subjectName },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}
