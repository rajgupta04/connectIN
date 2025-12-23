import React, { useState, useEffect, useContext } from 'react';
import { getPosts } from '../../api/posts';
import Layout from '../layout/Layout';
import PostForm from '../posts/PostForm';
import PostItem from '../posts/PostItem';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MapPin, GraduationCap } from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const socket = useSocket();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const education = Array.isArray(user?.education) && user.education.length > 0 ? user.education[0] : null;
    const educationLine = education
        ? [education.school, education.degree, education.fieldOfStudy].filter(Boolean).join(' • ')
        : null;
    const mentorName = user?.mentor?.name || '—';
    const profileViewCount = user?.profileViewCount ?? 0;
    const postImpressionCount = user?.postImpressionCount ?? 0;

    const fetchPosts = async () => {
        try {
            const res = await getPosts();
            setPosts(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching posts:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onImpressionUpdated = ({ postId, impressionCount }) => {
            if (!postId) return;
            setPosts(prev => prev.map(p => (p._id === postId ? { ...p, impressionCount } : p)));
        };

        socket.on('post_impression_updated', onImpressionUpdated);
        return () => socket.off('post_impression_updated', onImpressionUpdated);
    }, [socket]);

    const handlePostCreated = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
    };

    const handlePostDeleted = (postId) => {
        setPosts(prev => prev.filter(post => post._id !== postId));
    };

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left Sidebar - Profile Summary */}
                <div className="hidden lg:block w-1/4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-24 transition-colors duration-200">
                        <div className="h-16 bg-indigo-600 relative z-0">
                            {user?.coverUrl && (
                                <img
                                    src={user.coverUrl}
                                    alt="Cover"
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                />
                            )}
                        </div>

                        <div className="px-5 pb-5">
                            <div className="-mt-12 relative z-10">
                                <div className="border-4 border-white dark:border-gray-800 rounded-2xl inline-block bg-white dark:bg-gray-800">
                                    <img
                                        src={user?.avatarUrl || 'https://via.placeholder.com/96'}
                                        alt="Profile"
                                        className="w-20 h-20 rounded-2xl object-cover bg-white dark:bg-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="mt-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{user?.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{user?.headline || 'Member'}</p>

                                <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                    {!!user?.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} />
                                            <span className="line-clamp-1">{user.location}</span>
                                        </div>
                                    )}

                                    {!!educationLine && (
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={14} />
                                            <span className="line-clamp-1">{educationLine}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-600 dark:text-gray-300">Mentor:</span>
                                        <span className="line-clamp-1">{mentorName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 grid grid-cols-2">
                            <div className="px-5 py-3 flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Profile viewers</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{profileViewCount}</span>
                            </div>
                            <div className="px-5 py-3 flex items-center justify-between border-l border-gray-100 dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Post impressions</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{postImpressionCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="flex-1">
                    <PostForm onPostCreated={handlePostCreated} />
                    
                    {loading ? (
                        <div className="text-center py-10 dark:text-white">Loading posts...</div>
                    ) : (
                        <div className="space-y-6">
                            {posts.map(post => (
                                <PostItem 
                                    key={post._id} 
                                    post={post} 
                                    onDelete={handlePostDeleted}
                                />
                            ))}
                            {posts.length === 0 && (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    No posts yet. Be the first to post!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Recommendations (Static for now) */}
                <div className="hidden lg:block w-1/4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24 transition-colors duration-200">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Recommended Connections</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Feature coming soon...</p>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default Dashboard;
