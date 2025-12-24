import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, User, LogOut, GraduationCap, MessageSquare, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = ({ isOpen = false, onClose }) => {
    const { logout } = useContext(AuthContext);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Feed', path: '/dashboard' },
        { icon: Users, label: 'My Network', path: '/network' },
        { icon: GraduationCap, label: 'Mentorship', path: '/mentorship' },
        { icon: MessageSquare, label: 'Messages', path: '/chat' },
        { icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <div
            className={
                "fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col shadow-lg z-50 border-r border-gray-200 dark:border-slate-800 transition-all duration-200 transform " +
                (isOpen ? "translate-x-0" : "-translate-x-full") +
                " lg:translate-x-0"
            }
        >
            <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">In</div>
                <h1 className="text-xl font-bold tracking-wide text-gray-900 dark:text-white">ConnectIN</h1>
                </div>

                <button
                    type="button"
                    className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <X size={20} />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6">
                <ul className="space-y-2 px-4">
                    {menuItems.map((item, index) => (
                        <li key={index}>
                            <NavLink 
                                to={item.path} 
                                className={({ isActive }) => 
                                    `flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-white'
                                    }`
                                }
                                onClick={() => {
                                    if (onClose) onClose();
                                }}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-slate-800">
                <button 
                    onClick={logout}
                    className="flex items-center space-x-3 p-3 w-full rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
