import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-lightGray dark:bg-gray-900 font-sans transition-colors duration-200">
            <Sidebar />
            <div className="flex flex-col min-h-screen">
                <TopBar />
                <main className="flex-1 ml-64 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
