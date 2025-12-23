import axios from './axios';

export const sendMessage = (recipientId, content) => {
    return axios.post('/chat', { recipientId, content });
};

export const getConversations = () => {
    return axios.get('/chat/conversations');
};

export const getMessages = (userId) => {
    return axios.get(`/chat/${userId}`);
};
