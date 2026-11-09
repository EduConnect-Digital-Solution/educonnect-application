import React from 'react';

const Input = React.forwardRef(({ label, needed, ...props }, ref) => (
    <div>
        {label && (
            <label className="block text-xs font-medium text-gray-500 mb-1">
                {label} {needed && <span className="text-red-500">*</span>}
            </label>
        )}
        <input
            ref={ref}
            {...props}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
));

export default Input;
