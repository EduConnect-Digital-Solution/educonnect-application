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

// New API function for dashboard data
export async function getDashboardAnalytics() {
    try {
        const { data } = await apiClient.get('/api/admin/dashboard/analytics');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// New API function for dashboard data
export async function getParentDashboard() {
    try {
        const { data } = await apiClient.get('/api/parent/dashboard');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


// New API function for dashboard data
export async function getTeacherDashboard() {
    try {
        const { data } = await apiClient.get('/api/teacher/dashboard');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


// New API function for dashboard data
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




// New API function for dashboard data
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

// function to invite a teacher
export async function inviteTeacher(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/invite-teacher', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// function to invite a teacher
export async function inviteParent(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/invite-parent', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}


// Function Returns a maximum of 10 pending invitations
export async function getInvitations() {
    try {
        const { data } = await apiClient.get('/api/school/auth/invitations?status=pending');
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// function to invite a teacher
export async function resendInvitation(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/resend-invitation', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// function to invite a teacher
export async function terminateInvitation(payload) {
    try {
        const { data } = await apiClient.post('/api/school/auth/cancel-invitation', payload);
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
    /*
        {
          "schoolId": "SPR5866",
          "isActive": false,
          "reason": "School requested temporary suspension"
        }
    */
    try {
        const { data } = await apiClient.post('/api/school/profile/status', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

export async function reactivateSchool(payload) {
    /*
        {
          "schoolId": "SPR5866",
          "isActive": true,
          "reason": "School requested activation"
        }
    */
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
    // expected payload:
    // {
    //     "firstName": "Alice",
    //     "lastName": "Johnson-Updated",
    //     "class": "JSS2",
    //     "section": "B",
    //     "phone": "09033820144"
    // }
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


// Toggle User Status for Teachers and Parents
export async function toggleStatus(payload) {
    try {
        const { data } = await apiClient.post(`/api/admin/dashboard/users/toggle-status`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// Toggle User Status for Students
export async function toggleStudentStatus(payload) {
    try {
        const { data } = await apiClient.post(`/api/students/toggle-status`, payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// Toggle User Status for Students
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
    // expected payload:
    // {
    //     "teacherId": "694fe6e4f6a5eff53cd7f8eb",
    //     "classes": ["JSS2"],
    //     "schoolId": "SPR5866"
    // }
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
    // expected payload:
    // {
    //     "teacherId": "6962b912fa5cba86752091ff",
    //     "studentIds": ["6961b35ac534684284150259"],
    //     "schoolId": "FED9474"
    // }
    //
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
    // expected payload:
    // {
    //     "teacherId": "507f1f77bcf86cd799439011",
    //     "studentIds": ["507f1f77bcf86cd799439012"],
    //     "schoolId": "SCH0001"
    // }
    try {
        const { data } = await apiClient.post(`/api/admin/unassign-teacher`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

















export async function assignClasses(payload) {
    // expected Payload:
    // {
    //     "teacherId": "6962b912fa5cba86752091ff",
    //     "classes": ["JSS1"],
    //     "schoolId": "FED9474"
    // }
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
    // expected Payload:
    // {
    //     "firstName": "John",
    //     "lastName": "Doe-Updated",
    //     "phone": "01234567890"
    // }
    try {
        const { data } = await apiClient.put(`/api/school/profile/admin`,
            payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}







