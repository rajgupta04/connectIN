import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { getNotifications, markNotificationRead } from '../../api/notifications';
import moment from 'moment';
import { toast } from 'react-toastify';
import ThemeToggle from './ThemeToggle';

const TopBar = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme } = useTheme();
    const socket = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.read).length);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('notification', (newNotification) => {
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast.info(`New notification from ${newNotification.fromUser.name}`);
        });

        return () => {
            socket.off('notification');
        };
    }, [socket]);

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            try {
                await markNotificationRead(notification._id);
                setNotifications(notifications.map(n => 
                    n._id === notification._id ? { ...n, read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error(error);
            }
        }
    };

    const getNotificationText = (notification) => {
        switch (notification.type) {
            case 'like':
                return 'liked your post';
            case 'comment':
                return 'commented on your post';
            case 'connection_request':
                return 'sent you a connection request';
            case 'connection_accepted':
                return 'accepted your connection request';
            case 'message':
                return 'sent you a message';
            default:
                return 'interacted with you';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 h-16 border-b dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm ml-64 transition-colors duration-200">
            <div className="flex items-center space-x-8 flex-1">
                 {/* Search or other nav items could go here */}
                 <div className="hidden md:flex space-x-8 text-sm font-semibold text-gray-500 dark:text-gray-400">
                     {/* Placeholder links */}
                 </div>
            </div>

            <div className="flex items-center space-x-6">
                <ThemeToggle />

                <div className="relative">
                    <button 
                        className="relative text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50">
                            <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white">Notifications</h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div 
                                        key={notif._id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start space-x-3 ${!notif.read ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                    >
                                        <img 
                                            src={notif.fromUser.avatarUrl || 'https://via.placeholder.com/30'} 
                                            alt="" 
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                                <span className="font-bold">{notif.fromUser.name}</span> {getNotificationText(notif)}
                                            </p>
                                            {notif.message && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{notif.message}"</p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">{moment(notif.createdAt).fromNow()}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                                        No notifications
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <Link to="/profile" className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <img
                        src={user?.avatarUrl || 'https://via.placeholder.com/150'}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 object-cover"
                    />
                    <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user?.name || 'User'}</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default TopBar;
