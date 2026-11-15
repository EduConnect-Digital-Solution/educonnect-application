/**
 * Data layer for school documents: the school's document types, the files uploaded against people,
 * and the retention review. Files are private: opening one asks the server for a link that expires in a minute.
 */
import apiClient from '../../../../utils/axiosConfig.js';

const unwrap = (err, fallback) => {
    const data = err?.response?.data;
    return new Error(data?.errors?.[0]?.msg || data?.message || fallback);
};

const call = async (fn, fallback) => {
    try {
        const { data } = await fn();
        return data.data;
    } catch (err) { throw unwrap(err, fallback); }
};

// ----- Types -----
export const listDocumentTypes = async () => (await call(() => apiClient.get('/api/admin/document-types'), 'Could not load document types')).types;
export const createDocumentType = async (body) => (await call(() => apiClient.post('/api/admin/document-types', body), 'Could not create the document type')).type;
export const updateDocumentType = async (id, body) => (await call(() => apiClient.put(`/api/admin/document-types/${id}`, body), 'Could not update the document type')).type;
export const deleteDocumentType = (id) => call(() => apiClient.delete(`/api/admin/document-types/${id}`), 'Could not delete the document type');
export const listStarters = async () => (await call(() => apiClient.get('/api/admin/document-types/starters'), 'Could not load starters')).starters;
export const addStarters = (keys) => call(() => apiClient.post('/api/admin/document-types/starters', { keys }), 'Could not add the starters');

// ----- Files -----
export const getChecklist = (ownerType, ownerId) =>
    call(() => apiClient.get('/api/admin/documents/checklist', { params: { ownerType, ownerId } }), 'Could not load the documents');

export const uploadDocument = ({ typeId, ownerType, ownerId, file }) => {
    const form = new FormData();
    form.append('typeId', typeId);
    form.append('ownerType', ownerType);
    form.append('ownerId', ownerId);
    form.append('file', file); // the file goes last so the server has read the fields first
    return call(() => apiClient.post('/api/admin/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } }), 'The file could not be uploaded');
};

/** Asks for a short-lived link and returns { url, expiresInSeconds, fileName }. */
export const getDownloadLink = (id) => call(() => apiClient.post(`/api/admin/documents/${id}/download-link`), 'The file could not be opened');
export const deleteDocument = (id) => call(() => apiClient.delete(`/api/admin/documents/${id}`), 'The file could not be deleted');

// ----- Retention -----
export const listRetentionReview = async () => (await call(() => apiClient.get('/api/admin/documents/retention-review'), 'Could not load the retention review')).documents;
export const extendRetention = (id, months) => call(() => apiClient.post(`/api/admin/documents/${id}/extend-retention`, { months }), 'Could not extend retention');
