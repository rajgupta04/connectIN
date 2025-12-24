import React, { useState, useEffect } from 'react';
import { getMentors, updatePreferences, sendRequest } from '../../api/mentorship';
import Layout from '../layout/Layout';
import { Search, BookOpen, Clock, UserCheck, X } from 'lucide-react';
import MentorshipRequests from './MentorshipRequests';

const Mentorship = () => {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        topic: '',
        school: ''
    });
    const [showPreferences, setShowPreferences] = useState(false);
    const [myPreferences, setMyPreferences] = useState({
        isMentor: false,
        isMentee: false,
        mentorshipTopics: '',
        availability: ''
    });
    
    // Request Modal State
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [activeTab, setActiveTab] = useState('find'); // 'find' or 'requests'

    const fetchMentors = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.topic) params.append('topic', filters.topic);
            if (filters.school) params.append('school', filters.school);

            const res = await getMentors(params);
            setMentors(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMentors();
    }, [filters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handlePreferenceSubmit = async (e) => {
        e.preventDefault();
        try {
            const topicsArray = typeof myPreferences.mentorshipTopics === 'string' 
                ? myPreferences.mentorshipTopics.split(',').map(t => t.trim()) 
                : myPreferences.mentorshipTopics;

            const payload = {
                ...myPreferences,
                mentorshipTopics: topicsArray
            };

            await updatePreferences(payload);updatePreferences(payload);
            setShowPreferences(false);
            fetchMentors(); // Refresh list if I became a mentor (though I'm excluded from my own view)
            alert('Preferences updated!');
        } catch (err) {
            console.error(err);
            alert('Error updating preferences');
        }
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        try {
            await sendRequest(selectedMentor._id, requestMessage);
            alert('Request sent successfully!');
            setSelectedMentor(null);
            setRequestMessage('');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || 'Error sending request');
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mentorship</h1>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex w-full sm:w-auto">
                            <button 
                                onClick={() => setActiveTab('find')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'find' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                Find Mentor
                            </button>
                            <button 
                                onClick={() => setActiveTab('requests')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'requests' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                Requests
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowPreferences(!showPreferences)}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                            {showPreferences ? 'Close Settings' : 'Settings'}
                        </button>
                    </div>
                </div>

                {activeTab === 'requests' ? (
                    <MentorshipRequests />
                ) : (
                    <>
                {showPreferences && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-colors duration-200">
                        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Mentorship Preferences</h2>
                        <form onSubmit={handlePreferenceSubmit} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={myPreferences.isMentor}
                                        onChange={e => setMyPreferences({...myPreferences, isMentor: e.target.checked})}
                                        className="w-5 h-5 text-indigo-600 rounded"
                                    />
                                    <span className="font-medium text-gray-900 dark:text-gray-200">I want to be a Mentor</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={myPreferences.isMentee}
                                        onChange={e => setMyPreferences({...myPreferences, isMentee: e.target.checked})}
                                        className="w-5 h-5 text-indigo-600 rounded"
                                    />
                                    <span className="font-medium text-gray-900 dark:text-gray-200">I am looking for a Mentor</span>
                                </label>
                            </div>
                            
                            {myPreferences.isMentor && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topics you can mentor on (comma separated)</label>
                                        <input 
                                            type="text" 
                                            value={myPreferences.mentorshipTopics}
                                            onChange={e => setMyPreferences({...myPreferences, mentorshipTopics: e.target.value})}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder="e.g. React, Career Advice, Interview Prep"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Availability</label>
                                        <input 
                                            type="text" 
                                            value={myPreferences.availability}
                                            onChange={e => setMyPreferences({...myPreferences, availability: e.target.value})}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder="e.g. Weekends, 2 hours/week"
                                        />
                                    </div>
                                </>
                            )}
                            <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600">
                                Save Preferences
                            </button>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-wrap gap-4 transition-colors duration-200">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="text"
                            name="search"
                            placeholder="Search by name or headline..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full pl-10 p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <input 
                            type="text"
                            name="topic"
                            placeholder="Filter by Topic"
                            value={filters.topic}
                            onChange={handleFilterChange}
                            className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <input 
                            type="text"
                            name="school"
                            placeholder="Filter by School"
                            value={filters.school}
                            onChange={handleFilterChange}
                            className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                {/* Mentors Grid */}
                {loading ? (
                    <div className="text-center py-10 dark:text-white">Loading mentors...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mentors.map(mentor => (
                            <div key={mentor._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-colors duration-200">
                                <div className="flex items-start gap-4 mb-4">
                                    <img 
                                        src={mentor.avatarUrl || 'https://via.placeholder.com/100'} 
                                        alt={mentor.name} 
                                        className="w-16 h-16 rounded-full object-cover"
                                    />
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{mentor.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{mentor.headline}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-6 flex-grow">
                                    {mentor.mentorshipTopics && mentor.mentorshipTopics.length > 0 && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <BookOpen size={16} className="mt-1 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
                                            <div className="flex flex-wrap gap-1">
                                                {mentor.mentorshipTopics.map((topic, i) => (
                                                    <span key={i} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs">
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {mentor.availability && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Clock size={16} className="text-green-500 dark:text-green-400" />
                                            <span>{mentor.availability}</span>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setSelectedMentor(mentor)}
                                    className="w-full py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-colors"
                                >
                                    Request Mentorship
                                </button>
                            </div>
                        ))}
                        {mentors.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                                No mentors found matching your criteria.
                            </div>
                        )}
                    </div>
                )}
                </>
                )}

                {/* Request Modal */}
                {selectedMentor && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 transition-colors duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Mentorship</h3>
                                <button onClick={() => setSelectedMentor(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <img 
                                    src={selectedMentor.avatarUrl || 'https://via.placeholder.com/50'} 
                                    alt={selectedMentor.name} 
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedMentor.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedMentor.headline}</p>
                                </div>
                            </div>
                            <form onSubmit={handleRequestSubmit}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Message to Mentor
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white"
                                    rows="4"
                                    placeholder="Introduce yourself and explain why you'd like mentorship..."
                                    value={requestMessage}
                                    onChange={e => setRequestMessage(e.target.value)}
                                    required
                                ></textarea>
                                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedMentor(null)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Send Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Mentorship;
