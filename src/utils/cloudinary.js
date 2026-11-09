/**
 * Cloudinary unsigned upload.
 *
 * Config comes from Vite env (set in .env.local — see README):
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET   (an *unsigned* preset)
 *
 * The backend only ever stores the returned secure_url in `profileImage`.
 * If config is missing we throw a clear error rather than silently faking a URL.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || 'educonnect/avatars';

export function isCloudinaryConfigured() {
    return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Upload an image File to Cloudinary, returning the hosted secure URL.
 * @param {File} file
 * @returns {Promise<string>} secure_url
 */
export async function uploadToCloudinary(file) {
    if (!file) throw new Error('No file selected.');
    if (!file.type?.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.');
    if (!isCloudinaryConfigured()) {
        throw new Error('Image upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', FOLDER);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        let message = 'Upload failed. Please try again.';
        try { message = (await res.json())?.error?.message || message; } catch { /* ignore */ }
        throw new Error(message);
    }
    const data = await res.json();
    return data.secure_url;
}
