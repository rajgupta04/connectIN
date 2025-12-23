import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const AlumniCard = ({ user }) => {
    if (!user) return null;

    const education = Array.isArray(user.education) && user.education.length > 0 ? user.education[0] : null;
    const educationLine = education
        ? [education.school, education.degree, education.fieldOfStudy].filter(Boolean).join(' • ')
        : (user.degree || user.batch ? `${user.degree || ''}${user.batch ? ` '${user.batch}` : ''}`.trim() : null);

    const locationLine = user.location || user.city || '';

    const profileViewCount = user.profileViewCount ?? 0;
    const postImpressionCount = user.postImpressionCount ?? 0;
    const mentorName = user.mentor?.name || user.mentorName || '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
            {/* Banner */}
            <div className="h-16 bg-indigo-600"></div>

            <div className="px-5 pb-5">
                {/* Avatar + Header */}
                <div className="-mt-10 flex items-start justify-between">
                    <Link to={`/profile/${user._id}`} className="relative">
                        <div className="border-4 border-white dark:border-gray-800 rounded-2xl">
                            <img
                                src={user.avatarUrl || 'https://via.placeholder.com/96'}
                                alt={user.name}
                                className="w-20 h-20 rounded-2xl object-cover bg-white dark:bg-gray-700"
                            />
                        </div>
                    </Link>
                </div>

                <div className="mt-3">
                    <Link to={`/profile/${user._id}`} className="block">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:underline line-clamp-1">{user.name}</h3>
                    </Link>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {user.headline || user.role || 'Member'}
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                        {!!locationLine && (
                            <div className="flex items-center gap-2">
                                <MapPin size={14} />
                                <span className="line-clamp-1">{locationLine}</span>
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
                            <span className="line-clamp-1">{mentorName || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics */}
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
        </motion.div>
    );
};

export default AlumniCard;
