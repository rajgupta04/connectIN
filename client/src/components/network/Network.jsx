import React, { useState, useEffect, useContext } from 'react';
import { getConnectionRequests, getConnections, getAlumni, acceptConnectionRequest, sendConnectionRequest } from '../../api/network';
import Layout from '../layout/Layout';
import Modal from '../layout/Modal';
import { UserPlus, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';

const Network = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [connections, setConnections] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Connect Modal State
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [connectMessage, setConnectMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [requestsRes, connectionsRes, alumniRes] = await Promise.all([
                    getConnectionRequests(),
                    getConnections(),
                    getAlumni()
                ]);

                setRequests(requestsRes.data);
                setConnections(connectionsRes.data);
                
                // Filter suggestions: Remove self, existing connections, and pending requests
                // Note: For a real app, do this filtering on backend or handle efficiently
                const connectedIds = connectionsRes.data.map(c => c._id);
                // Also need to check if I sent a request (not implemented in get requests api yet effectively for this view)
                // For now, just show all alumni who are not in connections.
                
                // Ideally we should filter out the current user too, but let's assume backend handles or we filter by ID if we had it.
                // Simplified logic:
                setSuggestions(alumniRes.data.filter(u => !connectedIds.includes(u._id) && u._id !== user?._id));
                
                setLoading(false);
            } catch (error) {
                console.error("Error fetching network data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAccept = async (id) => {
        try {
            await acceptConnectionRequest(id);
            toast.success('Connection accepted');
            // Refresh data
            const requestsRes = await getConnectionRequests();
            const connectionsRes = await getConnections();
            setRequests(requestsRes.data);
            setConnections(connectionsRes.data);
        } catch (error) {
            toast.error('Error accepting connection');
        }
    };

    const handleConnectClick = (user) => {
        setSelectedUser(user);
        setConnectMessage('');
        setIsConnectModalOpen(true);
    };

    const confirmConnect = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            await sendConnectionRequest(selectedUser._id, connectMessage);
            toast.success('Connection request sent');
            // Remove from suggestions visually
            setSuggestions(suggestions.filter(s => s._id !== selectedUser._id));
            setIsConnectModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error sending request');
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Invitations Section */}
                {requests.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Invitations</h2>
                        <div className="space-y-4">
                            {requests.map(req => (
                                <div key={req._id} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                                    <div className="flex items-center space-x-4">
                                        <img src={req.requester.avatarUrl || 'https://via.placeholder.com/50'} alt="" className="w-14 h-14 rounded-full object-cover" />
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{req.requester.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{req.requester.headline}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleAccept(req._id)}
                                            className="p-2 rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                        >
                                            <Check size={24} />
                                        </button>
                                        <button className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggestions / Directory Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">People you may know</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {suggestions.map(user => (
                            <div key={user._id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center text-center relative">
                                <img src={user.avatarUrl || 'https://via.placeholder.com/80'} alt="" className="w-20 h-20 rounded-full object-cover mb-3" />
                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{user.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 h-8 line-clamp-2">{user.headline || user.role || 'Member'}</p>
                                <button 
                                    onClick={() => handleConnectClick(user)}
                                    className="mt-auto flex items-center justify-center space-x-2 px-4 py-1.5 border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-full text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 w-full"
                                >
                                    <UserPlus size={16} />
                                    <span>Connect</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Connections Section */}
                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Your Connections ({connections.length})</h2>
                    <div className="space-y-4">
                        {connections.map(conn => (
                             <div key={conn._id} className="flex items-center space-x-4 border-b border-gray-50 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                                <img src={conn.avatarUrl || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{conn.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{conn.headline || conn.role}</p>
                                </div>
                             </div>
                        ))}
                    </div>
                 </div>

            </div>

            <Modal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} title={`Connect with ${selectedUser?.name}`}>
                <form onSubmit={confirmConnect} className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        You can add a note to personalize your invitation to {selectedUser?.name}.
                    </p>
                    <textarea
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                        rows="4"
                        placeholder="Ex: Hi, I'd like to connect with you..."
                        value={connectMessage}
                        onChange={(e) => setConnectMessage(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsConnectModalOpen(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Send Invitation
                        </button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default Network;
