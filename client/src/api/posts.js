import api from './axios';

export const getPosts = () => api.get('/posts');
export const getPostsByUserId = (userId) => api.get(`/posts/user/${userId}`);
export const createPost = (postData) => api.post('/posts', postData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const likePost = (id) => api.put(`/posts/like/${id}`);
export const unlikePost = (id) => api.put(`/posts/unlike/${id}`);
export const addComment = (id, commentData) => api.post(`/posts/comment/${id}`, commentData);
export const replyToComment = (postId, commentId, replyData) => api.post(`/posts/comment/${postId}/${commentId}/reply`, replyData);
export const deleteComment = (postId, commentId) => api.delete(`/posts/comment/${postId}/${commentId}`);
export const recordImpression = (id) => api.post(`/posts/${id}/impression`);
