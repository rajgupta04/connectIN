import api from './axios';

export const getConnectionRequests = () => api.get('/connections/requests');
export const getConnections = () => api.get('/connections');
export const getAlumni = () => api.get('/alumni');
export const acceptConnectionRequest = (id) => api.put(`/connections/accept/${id}`);
export const sendConnectionRequest = (userId, message) => api.post(`/connections/request/${userId}`, { message });
