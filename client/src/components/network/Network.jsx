import React, { useState, useEffect, useContext, useRef } from 'react';
import { getConnectionRequests, getConnections, acceptConnectionRequest, sendConnectionRequest } from '../../api/network';
import { getRecommendations, getRecommendationsByIds } from '../../api/recommendations';
import Layout from '../layout/Layout';
import Modal from '../layout/Modal';
import { UserPlus, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import RecommendedConnectionCard from './RecommendedConnectionCard';

const Network = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [connections, setConnections] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [recsLoading, setRecsLoading] = useState(true);
    const [loading, setLoading] = useState(true);

    const removingIdsRef = useRef(new Set());
    const [removingTick, setRemovingTick] = useState(0);

    const seenKey = `connectin:seenRecommendations:${user?._id || 'anon'}`;
    const queueKey = `connectin:recommendationQueue:${user?._id || 'anon'}`;
    const seenIdsRef = useRef(new Set());
    
    // Connect Modal State
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [connectMessage, setConnectMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                let currentQueue = [];

                // Hydrate cached queue (keeps recommendations after reload)
                const cachedQueue = localStorage.getItem(queueKey);
                if (cachedQueue) {
                    try {
                        const parsedQueue = JSON.parse(cachedQueue);
                        if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
                            currentQueue = parsedQueue.slice(0, 10);
                            setRecommendations(currentQueue);

                            // Rehydrate cached objects from server so names/headlines stay current.
                            const ids = currentQueue.map((u) => u?._id).filter(Boolean);
                            if (ids.length > 0) {
                                try {
                                    const freshRes = await getRecommendationsByIds({ ids });
                                    const fresh = Array.isArray(freshRes.data) ? freshRes.data : [];
                                    if (fresh.length > 0) {
                                        currentQueue = fresh.slice(0, 10);
                                        setRecommendations(currentQueue);
                                        localStorage.setItem(queueKey, JSON.stringify(currentQueue));
                                    }
                                } catch (_) {
                                    // ignore rehydrate failures; keep cached
                                }
                            }
                        }
                    } catch (_) {
                        // ignore corrupt storage
                    }
                }

                const stored = localStorage.getItem(seenKey);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                            seenIdsRef.current = new Set(parsed);
                        }
                    } catch (_) {
                        // ignore corrupt storage
                    }
                }

                const [requestsRes, connectionsRes] = await Promise.all([
                    getConnectionRequests(),
                    getConnections()
                ]);

                setRequests(requestsRes.data);
                setConnections(connectionsRes.data);

                setRecsLoading(true);

                // Top up to 10 recommendations (server enforces filtering).
                const needed = Math.max(0, 10 - currentQueue.length);
                if (needed > 0) {
                    const exclude = Array.from(seenIdsRef.current);
                    const recRes = await getRecommendations({ limit: needed, exclude });
                    const fetched = Array.isArray(recRes.data) ? recRes.data : [];
                    if (fetched.length > 0) {
                        fetched.forEach((r) => seenIdsRef.current.add(r._id));
                        localStorage.setItem(seenKey, JSON.stringify(Array.from(seenIdsRef.current)));
                        const merged = [...currentQueue, ...fetched].slice(0, 10);
                        setRecommendations(merged);
                        localStorage.setItem(queueKey, JSON.stringify(merged));
                    } else if (currentQueue.length > 0) {
                        setRecommendations(currentQueue);
                        localStorage.setItem(queueKey, JSON.stringify(currentQueue));
                    }
                } else {
                    localStorage.setItem(queueKey, JSON.stringify(currentQueue.slice(0, 10)));
                }
                
                setLoading(false);
                setRecsLoading(false);
            } catch (error) {
                console.error("Error fetching network data:", error);
                setLoading(false);
                setRecsLoading(false);
            }
        };

        fetchData();
    }, [user?._id]);

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

    const fetchNextRecommendation = async () => {
        try {
            const exclude = Array.from(seenIdsRef.current);
            const res = await getRecommendations({ limit: 1, exclude });
            const next = Array.isArray(res.data) ? res.data[0] : null;
            if (!next) return null;

            seenIdsRef.current.add(next._id);
            localStorage.setItem(seenKey, JSON.stringify(Array.from(seenIdsRef.current)));
            return next;
        } catch (err) {
            return null;
        }
    };

    const removeRecommendationAndRefill = async (userId) => {
        removingIdsRef.current.add(userId);
        setRemovingTick((t) => t + 1);

        // Let the exit transition play.
        setTimeout(async () => {
            removingIdsRef.current.delete(userId);
            setRemovingTick((t) => t + 1);

            const next = await fetchNextRecommendation();
            setRecommendations((prev) => {
                const base = prev.filter((r) => r._id !== userId);
                const nextQueue = next ? [...base, next].slice(0, 10) : base.slice(0, 10);
                localStorage.setItem(queueKey, JSON.stringify(nextQueue));
                return nextQueue;
            });
        }, 200);
    };

    const confirmConnect = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            await sendConnectionRequest(selectedUser._id, connectMessage);
            toast.success('Connection request sent');
            // Remove from recommendations and fetch the next best.
            await removeRecommendationAndRefill(selectedUser._id);
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

                {/* Recommended Connections Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recommended Connections</h2>
                    {recsLoading ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading recommendations...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendations.map((rec) => (
                                <RecommendedConnectionCard
                                    key={rec._id}
                                    user={rec}
                                    onConnect={handleConnectClick}
                                    isRemoving={removingIdsRef.current.has(rec._id)}
                                />
                            ))}
                        </div>
                    )}
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
