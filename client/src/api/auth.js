import api from './axios';

export const loadUser = () => api.get('/auth');
export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);
