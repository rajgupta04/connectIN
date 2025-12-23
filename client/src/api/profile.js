import api from './axios';

export const getCurrentProfile = () => api.get('/profile/me');
export const getProfileById = (userId) => api.get(`/profile/user/${userId}`);
export const createProfile = (profileData) => api.post('/profile', profileData);
export const updateProfile = (profileData) => api.put('/profile', profileData);
export const addExperience = (expData) => api.put('/profile/experience', expData);
export const deleteExperience = (expId) => api.delete(`/profile/experience/${expId}`);
export const addEducation = (eduData) => api.put('/profile/education', eduData);
export const deleteEducation = (eduId) => api.delete(`/profile/education/${eduId}`);
export const uploadAvatar = (formData) => api.post('/profile/upload-avatar', formData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});

export const uploadCover = (formData) => api.post('/profile/upload-cover', formData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});
