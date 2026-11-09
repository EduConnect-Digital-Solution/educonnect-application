import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../navigation/navConfig.js';

/** Breadcrumb back to the Settings hub, with the current section name. */
export default function SettingsBreadcrumb({ section }) {
    return (
        <div className="flex items-center gap-2 mb-4 px-1">
            <Link
                to={ROUTES.settings}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-blue-700 transition-colors"
            >
                <ArrowLeft size={14} /> Settings
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-[13px] font-semibold text-gray-900">{section}</span>
        </div>
    );
}
