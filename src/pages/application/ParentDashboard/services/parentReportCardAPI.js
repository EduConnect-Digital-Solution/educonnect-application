import apiClient from '../../../../utils/axiosConfig.js';

/** Terms whose report cards the school has released for this child: [{ termId, termName, session, releasedAt }]. */
export async function listChildReportCards(childId) {
    try {
        const { data } = await apiClient.get(`/api/parent/children/${childId}/report-cards`);
        return data.data.reportCards;
    } catch (err) {
        throw new Error(err?.response?.data?.message || 'Could not load report cards.');
    }
}

// A failed download still answers with JSON, but it arrives as a Blob because a file was asked for
const messageFromBlob = async (err, fallback) => {
    if (err?.response?.status === 429) return 'Too many downloads. Try again in a few minutes.';
    try {
        return JSON.parse(await err.response.data.text()).message || fallback;
    } catch {
        return fallback;
    }
};

/** Downloads one released report card as a PDF and saves it under a readable name. */
export async function downloadChildReportCard(childId, termId, fileName) {
    let blob;
    try {
        ({ data: blob } = await apiClient.get(`/api/parent/children/${childId}/report-cards/${termId}/pdf`, {
            responseType: 'blob',
            timeout: 60000,
        }));
    } catch (err) {
        throw new Error(await messageFromBlob(err, 'The report card could not be downloaded.'));
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
