import apiClient from '../../utils/axiosConfig';

export async function RegSchool(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/register', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function LoginSchool(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/login', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function LoginUser(payload) {
    try {
        const { data } = await apiClient.post('/api/user/auth/login', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getStudentInfo(studentId) {
    try {
        const { data } = await apiClient.get(`/api/parent/children/${studentId}`);
        return data.data.children[0];
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getStudentInfoAdmin(studentId) {
    // example response:
    // {
    //     "success": true,
    //     "message": "Student details retrieved successfully",
    //     "data": {
    //     "student": {
    //         "id": "453bb662-8842-445c-81ba-8980874a149b",
    //             "studentId": null,
    //             "firstName": "Prisilla",
    //             "lastName": "Daniels",
    //             "fullName": "Prisilla Daniels",
    //             "email": "priscdaniels@gmail.com",
    //             "classId": "e4d61b2d-e50c-41cc-b442-bf7e3f099703",
    //             "armId": "ab3dc3c3-a654-40cf-8244-91b51962c04f",
    //             "rollNumber": null,
    //             "grade": null,
    //             "dateOfBirth": "2026-06-17T00:00:00.000Z",
    //             "gender": "male",
    //             "address": "389, Avenue Des Rossignols, Morc Safeland",
    //             "phone": "58534721",
    //             "profileImage": null,
    //             "isActive": true,
    //             "createdAt": "2026-06-04T14:55:32.232Z",
    //             "updatedAt": "2026-06-04T14:55:32.233Z",
    //             "parents": [
    //             {
    //                 "id": "01870af8-23fc-4a0f-8ab2-0911a38d068e",
    //                 "name": "Blessing Daniels",
    //                 "email": "regos85058@aspensif.com",
    //                 "phone": null
    //             },
    //             {
    //                 "id": "8598ca83-bbed-47a8-88d4-d968eddbacdd",
    //                 "name": "Test Parent",
    //                 "email": "homaw79499@5nek.com",
    //                 "phone": "+2348103203934"
    //             }
    //         ],
    //             "teachers": []
    //     },
    //     "cached": false,
    //         "generatedAt": "2026-06-11T17:27:37.122Z"
    // }
    // }
    try {
        const { data } = await apiClient.get(`/api/students/${studentId}`);
        return data.data.student;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getParentProfile() {
    try {
        const { data } = await apiClient.get(`/api/parent/profile`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function verifyOTP(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/verify-email', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function resendOTP(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/resend-otp', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getDashboardAnalytics() {
    try {
        const { data } = await apiClient.get('/api/admin/dashboard/analytics');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getParentDashboard() {
    try {
        const { data } = await apiClient.get('/api/parent/dashboard');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getTeacherDashboard() {
    try {
        const { data } = await apiClient.get('/api/teacher/dashboard');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getTeacherClasses() {
    try {
        const { data } = await apiClient.get('/api/teacher/classes');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getTeacherStudents() {
    try {
        const { data } = await apiClient.get('/api/teacher/students');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getSubjectsByClass(className) {

    try {
        const { data } = await apiClient.get(`/api/teacher/classes/${className}/subjects`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getStudentsByClassandSubject(className, subjectName) {
    try {
        const { data } = await apiClient.get(`/api/teacher/classes/${className}/subjects/${subjectName}/students`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function assignGrade(payload) {
    try {
        const { data } = await apiClient.post(`/api/teacher/grades`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function publishGrade(payload) {
    try {
        const { data } = await apiClient.post(`/api/teacher/grades/publish`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function updateGrade(payload, gradeId) {
    try {
        const { data } = await apiClient.put(`/api/teacher/grades/${gradeId}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function viewGrade(studentId) {
    try {
        const { data } = await apiClient.get(`/api/teacher/students/${studentId}/grades`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getDashboardUsers(role = '', status = '') {
    try {
        const { data } = await apiClient.get('/api/admin/dashboard/users', {
            params: {

                role: role || undefined,
                status: status || undefined
            }
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function inviteTeacher(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/invite-teacher', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function inviteParent(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/invite-parent', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getInvitations() {
    try {
        const { data } = await apiClient.get('/api/school/auth/invitations?status=pending');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function resendInvitation(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/resend-invitation', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function terminateInvitation(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/cancel-invitation', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deletePermanentInvitation(invitationId) {
    try {
        const { data } = await apiClient.delete(`/api/admin/dashboard/invitations/${invitationId}/permanent`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


export async function getAllStudents() {
    try {
        const { data } = await apiClient.get('/api/students');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getAllParents() {
    try {
        const { data } = await apiClient.get('/api/parent-management/parents');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getSchoolProfile() {
    try {
        const { data } = await apiClient.get('/api/school/profile');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function createStudent(payload) {
    try {
        const { data } = await apiClient.post('/api/students', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deactivateSchool(payload) {
    try {
        const { data } = await apiClient.post('/api/school/profile/status', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function reactivateSchool(payload) {
    try {
        const { data } = await apiClient.post('/api/school/profile/status', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function verifySession() {
    try {
        const { data } = await apiClient.get('/api/user/auth/me');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function updateStudent(studentId, payload) {
    try {
        const { data } = await apiClient.put(`/api/students/${studentId}`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function updateSchool(payload) {
    try {
        const { data } = await apiClient.put(`/api/school/profile`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function toggleStatus(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/dashboard/users/toggle-status`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function toggleStudentStatus(payload) {
    try {
        const { data } = await apiClient.post(`/api/students/toggle-status`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deleteUser(payload) {
    try {
        const { data } = await apiClient.delete(`/api/admin/dashboard/users/remove`, {data: payload});
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deleteStudent(payload) {
    try {
        const { data } = await apiClient.delete(`/api/students/remove`, {data: payload});
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deleteGrade(payload, studentId) {
    try {
        const { data } = await apiClient.delete(`/api/teacher/grades/${studentId}`, {data: payload});
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function deleteClasses(payload) {
    try {
        const { data } = await apiClient.delete(`/api/admin/teachers/remove-classes`, {data: payload});
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function linkStudentToParent(payload, parentId) {
    try {
        const { data } = await apiClient.post(`/api/parent-management/parents/${parentId}/link-students`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function unlinkStudentToParent(payload, parentId) {
    try {
        const { data } = await apiClient.post(`/api/parent-management/parents/${parentId}/unlink-students`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function assignSubjects(payload) {

    try {
        const { data } = await apiClient.post(`/api/admin/teachers/assign-subjects`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function completeRegistration(payload) {
    try {
        const { data } = await apiClient.post(`/api/user/auth/complete-registration`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function assignStudenttoTeacher(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/assign-teacher`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function bulkAssignStudentToTeacher(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/assign-teachers-bulk`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function unassignStudentToTeacher(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/unassign-teacher`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function assignClasses(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/teachers/assign-classes`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function updateParentProfile(payload) {
    try {
        const { data } = await apiClient.put(`/api/parent/profile`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function updateAdminProfile(payload) {
    try {
        const { data } = await apiClient.put(`/api/school/profile/admin`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function getParentDetails(parentId) {
    try {
        const { data } = await apiClient.get(`/api/parent-management/parents/${parentId}`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


export async function getTeacherDetails() {
    try {
        const { data } = await apiClient.get(`/api/teacher/profile`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


export async function getPendingFees(parentId) {
   return [{
       "studentId": "453bb662-8842-445c-81ba-8980874a149b",
       "studentName": "Prisilla Daniels",
       "className": null,
       "feeStructureId": "43ca595d-5577-4bad-bcad-cc55599d794e",
       "feeStructureName": "SSS2 First Term School Fees",
       "invoiceNumber": "INV-5B0B3-MPZYBJT1-0000",
       "amount": 20000000,
       "amountPaid": 0,
       "amountDue": 20000000,
       "dueDate": "2026-06-17T00:00:00.000Z",
       "status": "pending",
       "academicYearId": "74718fda-6ada-48cf-a52f-c4dc9cf05743",
       "termId": "e4df07a0-ebb3-401b-8f09-4d78f0717d2b",
       "isActive": true,
   }]
}

