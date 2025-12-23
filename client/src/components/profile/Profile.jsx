import React, { useEffect, useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { updateProfile, uploadAvatar, uploadCover, getProfileById } from '../../api/profile';
import { getPostsByUserId } from '../../api/posts';
import Layout from '../layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MapPin, Briefcase, Calendar, Edit2 } from 'lucide-react';
import moment from 'moment';
import EducationSection from './EducationSection';
import ExperienceSection from './ExperienceSection';
import PostItem from '../posts/PostItem';
import Modal from '../layout/Modal';
import EditSection from '../layout/EditSection';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob } from '../../lib/cropImage';

const Profile = () => {
    const { userId } = useParams();
    const { user: authUser, loadUser: loadUserContext } = useContext(AuthContext);
    const socket = useSocket();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = !userId || (authUser && authUser._id === userId);

    // Modal States
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isEditAboutOpen, setIsEditAboutOpen] = useState(false);

    // Form States
    const [profileFormData, setProfileFormData] = useState({
        headline: '',
        location: '',
        company: ''
    });
    const [aboutFormData, setAboutFormData] = useState({
        about: ''
    });
    

    // Cover crop modal state
    const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);
    const [coverImageSrc, setCoverImageSrc] = useState(null);
    const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
    const [coverZoom, setCoverZoom] = useState(1);
    const [coverCroppedPixels, setCoverCroppedPixels] = useState(null);
    const [isCoverUploading, setIsCoverUploading] = useState(false);

    const fetchProfile = async () => {
        try {
            let res;
            if (userId) {
                res = await getProfileById(userId);
            } else if (authUser) {
                res = await getProfileById(authUser._id);
            } else {
                return;
            }
            
            setProfile(res.data);
            
            // Fetch posts
            const postsRes = await getPostsByUserId(res.data._id);
            setPosts(postsRes.data);

            setLoading(false);
            
            // Initialize form data only if it's own profile
            if (isOwnProfile) {
                setProfileFormData({
                    headline: res.data.headline || '',
                    location: res.data.location || '',
                    company: res.data.company || ''
                });
                setAboutFormData({
                    about: res.data.about || ''
                });
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authUser || userId) {
            fetchProfile();
        }
    }, [userId, authUser]);

    useEffect(() => {
        if (!socket) return;

        const onImpressionUpdated = ({ postId, impressionCount }) => {
            if (!postId) return;
            setPosts(prev => prev.map(p => (p._id === postId ? { ...p, impressionCount } : p)));
        };

        socket.on('post_impression_updated', onImpressionUpdated);
        return () => socket.off('post_impression_updated', onImpressionUpdated);
    }, [socket]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateProfile(profileFormData);
            setIsEditProfileOpen(false);
            fetchProfile();
            loadUserContext();
        } catch (error) {
            console.error(error);
            alert('Error updating profile');
        }
    };

    const handleAboutUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateProfile(aboutFormData);
            setIsEditAboutOpen(false);
            fetchProfile();
            loadUserContext();
        } catch (error) {
            console.error(error);
            alert('Error updating about section');
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                await uploadAvatar(formData);
                fetchProfile();
                loadUserContext();
            } catch (error) {
                console.error(error);
                alert('Error updating profile picture');
            }
        }
    };

    const handleCoverChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setCoverImageSrc(objectUrl);
            setCoverCrop({ x: 0, y: 0 });
            setCoverZoom(1);
            setCoverCroppedPixels(null);
            setIsCoverCropOpen(true);
        }
    };

    const onCoverCropComplete = (_, croppedAreaPixels) => {
        setCoverCroppedPixels(croppedAreaPixels);
    };

    const closeCoverCrop = () => {
        setIsCoverCropOpen(false);
        if (coverImageSrc) {
            URL.revokeObjectURL(coverImageSrc);
        }
        setCoverImageSrc(null);
        setCoverCroppedPixels(null);
        setCoverZoom(1);
        setCoverCrop({ x: 0, y: 0 });
    };

    const saveCoverCrop = async () => {
        if (!coverImageSrc || !coverCroppedPixels) return;
        setIsCoverUploading(true);
        try {
            const blob = await getCroppedImageBlob(coverImageSrc, coverCroppedPixels, { type: 'image/jpeg', quality: 0.9 });

            if (!blob) {
                throw new Error('Failed to crop image');
            }

            const formData = new FormData();
            formData.append('cover', blob, 'cover.jpg');

            await uploadCover(formData);
            await fetchProfile();
            await loadUserContext();
            closeCoverCrop();
        } catch (error) {
            console.error(error);
            alert('Error updating cover photo');
        } finally {
            setIsCoverUploading(false);
        }
    };

    const onProfileChange = (e) => setProfileFormData({ ...profileFormData, [e.target.name]: e.target.value });
    const onAboutChange = (e) => setAboutFormData({ ...aboutFormData, [e.target.name]: e.target.value });

    if (loading) return <Layout><div>Loading...</div></Layout>;

    return (
        <Layout>
             <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative transition-colors duration-200">
                    <div className="h-32 bg-indigo-600 relative">
                        {profile?.coverUrl && (
                            <img
                                src={profile.coverUrl}
                                alt="Cover"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}

                        {isOwnProfile && (
                            <label className="absolute inset-0 flex items-center justify-end p-3 bg-black/0 hover:bg-black/20 cursor-pointer transition-colors">
                                <span className="text-xs font-semibold text-white bg-black/40 px-3 py-1 rounded-full">
                                    Change cover
                                </span>
                                <input type="file" className="hidden" onChange={handleCoverChange} accept="image/*" />
                            </label>
                        )}
                    </div>
                    <div className="px-8 pb-8">
                         <div className="absolute top-20 left-8 border-4 border-white dark:border-gray-800 rounded-full group transition-colors duration-200">
                            <img 
                                src={profile?.avatarUrl || 'https://via.placeholder.com/150'} 
                                alt="Profile" 
                                className="w-32 h-32 rounded-full object-cover bg-white dark:bg-gray-700"
                            />
                            {isOwnProfile && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <Edit2 className="text-white" size={24} />
                                    <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                                </label>
                            )}
                         </div>
                         {isOwnProfile && (
                             <div className="flex justify-end mt-4">
                                 <button 
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                 >
                                     <Edit2 size={20} />
                                 </button>
                             </div>
                         )}
                         <div className="mt-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-1 text-lg">{profile?.headline || 'No headline added'}</p>
                            
                            <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span><strong>{profile?.connections?.length || 0}</strong> connections</span>
                                <span><strong>{profile?.postCount || 0}</strong> posts</span>
                                <span><strong>{profile?.profileViewCount || 0}</strong> profile views</span>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className={`flex items-center ${isOwnProfile ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`} onClick={() => isOwnProfile && setIsEditProfileOpen(true)}>
                                    <Briefcase size={16} className="mr-2" />
                                    <span>{profile?.company || (isOwnProfile ? 'Add Company' : '')}</span>
                                </div>
                                <div className={`flex items-center ${isOwnProfile ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`} onClick={() => isOwnProfile && setIsEditProfileOpen(true)}>
                                    <MapPin size={16} className="mr-2" />
                                    <span>{profile?.location || (isOwnProfile ? 'Add Location' : '')}</span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar size={16} className="mr-2" />
                                    <span>Joined {moment(profile?.createdAt).format('MMMM YYYY')}</span>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                {/* About Section */}
                <EditSection 
                    title="About" 
                    headerAction={
                        isOwnProfile && (
                            <button 
                                onClick={() => setIsEditAboutOpen(true)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <Edit2 size={18} />
                            </button>
                        )
                    }
                >
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {profile?.about || (isOwnProfile ? 'Write something about yourself...' : 'No about info.')}
                    </p>
                </EditSection>

                <EditSection title="Mentorship">
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        <p><span className="font-semibold">Mentor:</span> {profile?.isMentor ? 'Yes' : 'No'}</p>
                        <p><span className="font-semibold">Mentee:</span> {profile?.isMentee ? 'Yes' : 'No'}</p>
                        <p><span className="font-semibold">Topics:</span> {profile?.mentorshipTopics?.length ? profile.mentorshipTopics.join(', ') : 'Not specified'}</p>
                        <p><span className="font-semibold">Availability:</span> {profile?.availability || 'Not specified'}</p>
                    </div>
                </EditSection>

                {/* Experience Section */}
                {/* Posts Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Posts</h2>
                    {posts.length > 0 ? (
                        posts.map(post => (
                            <PostItem key={post._id} post={post} />
                        ))
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
                            No posts to show.
                        </div>
                    )}
                </div>

                <ExperienceSection experience={profile?.experience} onUpdate={fetchProfile} isOwnProfile={isOwnProfile} />

                {/* Education Section */}
                <EducationSection education={profile?.education} onUpdate={fetchProfile} isOwnProfile={isOwnProfile} />

             </div>

             {/* Edit Profile Modal */}
             <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Edit Intro">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Headline</label>
                        <input
                            type="text"
                            name="headline"
                            value={profileFormData.headline}
                            onChange={onProfileChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="Software Engineer at Google"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Company</label>
                        <input
                            type="text"
                            name="company"
                            value={profileFormData.company}
                            onChange={onProfileChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="Google"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={profileFormData.location}
                            onChange={onProfileChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="San Francisco, CA"
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
             </Modal>

             {/* Edit About Modal */}
             <Modal isOpen={isEditAboutOpen} onClose={() => setIsEditAboutOpen(false)} title="Edit About">
                <form onSubmit={handleAboutUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">About</label>
                        <textarea
                            name="about"
                            rows="6"
                            value={aboutFormData.about}
                            onChange={onAboutChange}
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white"
                            placeholder="Tell us about yourself..."
                        ></textarea>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
             </Modal>

             {/* Crop Cover Modal */}
             <Modal isOpen={isCoverCropOpen} onClose={closeCoverCrop} title="Crop cover">
                <div className="space-y-4">
                    <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        {coverImageSrc && (
                            <Cropper
                                image={coverImageSrc}
                                crop={coverCrop}
                                zoom={coverZoom}
                                aspect={4 / 1}
                                onCropChange={setCoverCrop}
                                onZoomChange={setCoverZoom}
                                onCropComplete={onCoverCropComplete}
                                restrictPosition={false}
                                objectFit="horizontal-cover"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={coverZoom}
                            onChange={(e) => setCoverZoom(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeCoverCrop}
                            disabled={isCoverUploading}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={saveCoverCrop}
                            disabled={isCoverUploading || !coverCroppedPixels}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {isCoverUploading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
             </Modal>

        </Layout>
    );
};

export default Profile;
