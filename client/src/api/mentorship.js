import api from './axios';

export const getMentors = (params) => api.get('/mentorship/mentors', { params });
export const updatePreferences = (preferences) => api.put('/mentorship/preferences', preferences);
export const sendRequest = (mentorId, message) => api.post(`/mentorship/request/${mentorId}`, { message });
export const getRequests = () => api.get('/mentorship/requests');
export const updateRequestStatus = (requestId, status) => api.put(`/mentorship/request/${requestId}`, { status });
