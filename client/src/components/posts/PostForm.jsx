import React, { useState } from 'react';
import { createPost } from '../../api/posts';
import { toast } from 'react-toastify';
import { Image, X } from 'lucide-react';

const PostForm = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState('image');
  const [loading, setLoading] = useState(false);

  const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_MEDIA_BYTES) {
        toast.error('Media must be 50MB or less');
        e.target.value = '';
        return;
      }
      setImage(file);
      setPreviewType(file.type && file.type.startsWith('video/') ? 'video' : 'image');
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    setPreviewType('image');
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (image) {
        formData.append('media', image);
      }

      const res = await createPost(formData);
      onPostCreated(res.data);
      setContent('');
      removeImage();
      toast.success('Post Created');
    } catch (err) {
      console.error(err);
      toast.error('Error creating post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-200">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Start a Post</h3>
      <form onSubmit={onSubmit}>
        <textarea
          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none bg-transparent dark:text-white"
          placeholder="What do you want to talk about?"
          rows="3"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        ></textarea>

        {preview && (
          <div className="relative mt-4 inline-block">
            {previewType === 'video' ? (
              <video
                src={preview}
                controls
                className="h-32 w-auto rounded-lg object-cover border border-gray-200 dark:border-gray-600"
              />
            ) : (
              <img src={preview} alt="Preview" className="h-32 w-auto rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <X size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <Image size={24} />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
