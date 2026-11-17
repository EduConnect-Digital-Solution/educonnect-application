/**
 * Opens the PDF a generation job produced. The file is private: the server hands out a link that
 * works for a minute, so it is asked for at the moment of opening. When the server keeps the file
 * on its own disk (no file storage configured) it is downloaded through the signed-in session instead.
 * Throws an Error with a message for the user; `error.gone` is true when the file no longer exists.
 */
import apiClient from '../../../../utils/axiosConfig.js';
import openSignedLink from '../../../../utils/openSignedLink.js';

const messageOf = (err, fallback) => err?.response?.data?.message || fallback;

export async function openPdfJobFile(jobId) {
    let link;
    try {
        const { data } = await apiClient.post(`/api/admin/results/pdf-jobs/${jobId}/download-link`);
        link = data.data;
    } catch (err) {
        const error = new Error(messageOf(err, 'The PDF could not be opened.'));
        // The file no longer exists: the caller should offer to generate it again
        error.gone = err?.response?.status === 410 || err?.response?.status === 404;
        throw error;
    }

    if (!link.local) {
        if (!link.url) throw new Error('The PDF could not be opened.');
        openSignedLink(link.url);
        return;
    }

    try {
        const { data: blob } = await apiClient.get(`/api/admin/results/pdf-jobs/${jobId}/download`, { responseType: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = link.fileName || 'report-cards.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
        throw new Error('The PDF could not be downloaded.');
    }
}
