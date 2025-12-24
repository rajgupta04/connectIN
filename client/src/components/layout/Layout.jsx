import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-lightGray dark:bg-gray-900 font-sans transition-colors duration-200">
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/30 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-col min-h-screen">
                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 lg:ml-64 p-4 sm:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
