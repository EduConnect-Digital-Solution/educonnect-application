import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import apiClient from '../../utils/axiosConfig.js';
import { Field } from '../patterns/FormKit.jsx';
import { inputClass } from '../patterns/formHelpers.js';
import { pushToast } from '../patterns/toastBus.js';

// The server's rule, checked here first so mistakes show beside the field straight away
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
const RULE = 'At least 8 characters, with an uppercase letter, a lowercase letter, a number and one of @$!%*?&';
const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

const validate = (form) => {
    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || form.newPassword.length > 128 || !STRONG.test(form.newPassword)) errors.newPassword = RULE;
    else if (form.newPassword === form.currentPassword) errors.newPassword = 'Choose a password different from your current one';
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'The two new passwords do not match';
    return errors;
};

// Turns the server's answer into messages beside the right field, or one message for the form
const serverErrors = (err) => {
    const data = err?.response?.data || {};
    if (err?.response?.status === 429) return { form: 'Too many attempts. Try again in 15 minutes.' };
    if (data.code === 'WRONG_PASSWORD') return { currentPassword: data.message };
    if (data.code === 'SAME_PASSWORD') return { newPassword: data.message };
    if (Array.isArray(data.errors) && data.errors.length > 0) {
        return Object.fromEntries(data.errors.map((e) => [e.field, e.message]));
    }
    return { form: data.message || 'Your password could not be changed. Try again.' };
};

/** Lets a signed-in person change their own password. Other signed-in devices are signed out. */
export default function ChangePasswordCard({ className = '' }) {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const change = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
    };

    const submit = async (e) => {
        e.preventDefault();
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSaving(true);
        try {
            const { data } = await apiClient.post('/api/account/change-password', form);
            setForm(EMPTY);
            pushToast({ message: data?.message || 'Password changed.', type: 'success' });
        } catch (err) {
            setErrors(serverErrors(err));
        } finally {
            setSaving(false);
        }
    };

    const input = (name, label, autoComplete, hint) => (
        <Field label={label} htmlFor={`pw-${name}`} error={errors[name]} hint={hint} required>
            <input
                id={`pw-${name}`}
                name={name}
                type="password"
                autoComplete={autoComplete}
                value={form[name]}
                onChange={change}
                aria-invalid={Boolean(errors[name])}
                className={inputClass(Boolean(errors[name]))}
            />
        </Field>
    );

    return (
        <form onSubmit={submit} noValidate className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 ${className}`}>
            <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <KeyRound size={16} /> Change password
                </h3>
                <p className="text-xs text-gray-500 mt-1">You stay signed in here; other devices are signed out.</p>
            </div>

            {input('currentPassword', 'Current password', 'current-password')}
            {input('newPassword', 'New password', 'new-password', '8+ characters')}
            {input('confirmPassword', 'Confirm new password', 'new-password')}

            {errors.form && <p role="alert" className="text-sm text-red-600">{errors.form}</p>}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors"
                >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? 'Changing…' : 'Change password'}
                </button>
            </div>
        </form>
    );
}
