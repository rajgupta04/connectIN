import React from 'react';

const EditSection = ({ title, headerAction, children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-200 ${className}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {headerAction}
            </div>
            {children}
        </div>
    );
};

export default EditSection;
