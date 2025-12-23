import React, { useState, useEffect, useContext } from 'react';
import { getRequests, updateRequestStatus } from '../../api/mentorship';
import { AuthContext } from '../../context/AuthContext';
import { Check, X, Clock, MessageSquare } from 'lucide-react';
import moment from 'moment';

const MentorshipRequests = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await getRequests();
            setRequests(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleStatusUpdate = async (requestId, status) => {
        try {
            await updateRequestStatus(requestId, status);
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert('Error updating status');
        }
    };

    if (loading) return <div>Loading requests...</div>;

    const incomingRequests = requests.filter(req => req.mentor._id === user._id);
    const outgoingRequests = requests.filter(req => req.mentee._id === user._id);

    return (
        <div className="space-y-8">
            {/* Incoming Requests (For Mentors) */}
            {incomingRequests.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 text-gray-900">Incoming Requests</h2>
                    <div className="space-y-4">
                        {incomingRequests.map(req => (
                            <div key={req._id} className="border border-gray-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-3">
                                    <img 
                                        src={req.mentee.avatarUrl || 'https://via.placeholder.com/50'} 
                                        alt={req.mentee.name} 
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <h3 className="font-bold text-gray-900">{req.mentee.name}</h3>
                                        <p className="text-sm text-gray-500">{req.mentee.headline}</p>
                                        <div className="mt-2 bg-gray-50 p-2 rounded text-sm text-gray-700 flex items-start gap-2">
                                            <MessageSquare size={14} className="mt-1 flex-shrink-0 text-gray-400" />
                                            <span>{req.message}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{moment(req.createdAt).fromNow()}</p>
                                    </div>
                                </div>

                                {req.status === 'pending' ? (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleStatusUpdate(req._id, 'accepted')}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                        <button 
                                            onClick={() => handleStatusUpdate(req._id, 'rejected')}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium"
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </div>
                                ) : (
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                        req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {req.status}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Outgoing Requests (For Mentees) */}
            {outgoingRequests.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 text-gray-900">Sent Requests</h2>
                    <div className="space-y-4">
                        {outgoingRequests.map(req => (
                            <div key={req._id} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={req.mentor.avatarUrl || 'https://via.placeholder.com/50'} 
                                        alt={req.mentor.name} 
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="text-sm text-gray-900">Request to <span className="font-bold">{req.mentor.name}</span></p>
                                        <p className="text-xs text-gray-500">{moment(req.createdAt).fromNow()}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                    req.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                                    req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {req.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorshipRequests;
