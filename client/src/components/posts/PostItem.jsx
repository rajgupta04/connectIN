import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { likePost, addComment, replyToComment, deleteComment as apiDeleteComment, deletePost as apiDeletePost, recordImpression } from '../../api/posts';
import { AuthContext } from '../../context/AuthContext';
import { Heart, MessageCircle, Trash2, CornerDownRight } from 'lucide-react';

const CommentItem = ({ comment, postId, authUser, onDelete, onReply, activeReplyId, setActiveReplyId, replyText, setReplyText, handleReplySubmit, depth = 0 }) => {
    const isReplying = activeReplyId === comment._id;

    return (
        <div className="group relative">
            <div className="flex space-x-3">
                <img
                    src={comment.user?.avatarUrl || 'https://via.placeholder.com/30'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover relative z-10"
                />
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">@{comment.user?.name?.replace(/\s+/g, '').toLowerCase()}</h5>
                        <span className="text-xs text-gray-400">{moment(comment.date).fromNow()}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-300 mt-1">{comment.text}</p>

                    <div className="flex items-center space-x-4 mt-2">
                        <button
                            onClick={() => setActiveReplyId(isReplying ? null : comment._id)}
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            Reply
                        </button>
                        {authUser && comment.user?._id === authUser._id && (
                            <button onClick={() => onDelete(comment._id)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                        )}
                    </div>

                    {/* Reply Input */}
                    {isReplying && (
                        <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className="flex space-x-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <img
                                src={authUser?.avatarUrl || 'https://via.placeholder.com/30'}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none text-sm bg-transparent dark:text-gray-100"
                                    placeholder="Add a reply..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <div className="flex justify-end mt-2 space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveReplyId(null)}
                                        className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!replyText.trim()}
                                        className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-4 pl-2">
                            {comment.replies.map(reply => (
                                <div key={reply._id} className="relative">
                                     {/* Thread Line */}
                                    <div className="absolute -left-2 -top-4 bottom-4 w-4 border-l-2 border-b-2 border-gray-200 dark:border-gray-700 rounded-bl-xl group-hover:border-indigo-400 transition-colors duration-200"></div>
                                    
                                    <CommentItem 
                                        comment={reply} 
                                        postId={postId} 
                                        authUser={authUser} 
                                        onDelete={onDelete} 
                                        onReply={onReply}
                                        activeReplyId={activeReplyId}
                                        setActiveReplyId={setActiveReplyId}
                                        replyText={replyText}
                                        setReplyText={setReplyText}
                                        handleReplySubmit={handleReplySubmit}
                                        depth={depth + 1}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PostItem = ({ post, onDelete }) => {
  const { user: authUser } = useContext(AuthContext);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [impressionCount, setImpressionCount] = useState(post.impressionCount || 0);

  const postRef = useRef(null);
  const hasRecordedImpression = useRef(false);

  useEffect(() => {
    setImpressionCount(post.impressionCount || 0);
  }, [post.impressionCount]);

  const isLiked = likes.includes(authUser?._id);
  const isOwner = !!authUser && post.user?._id === authUser._id;

  const handleLike = async () => {
    try {
      const res = await likePost(post._id);
      setLikes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    try {
      const res = await addComment(post._id, { text: commentText });
      setComments(res.data);
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    try {
      const res = await replyToComment(post._id, commentId, { text: replyText });
      setComments(res.data);
      setReplyText('');
      setActiveReplyId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComment = async (commentId) => {
      try {
          const res = await apiDeleteComment(post._id, commentId);
          setComments(res.data);
      } catch (err) {
          console.error(err);
      }
  }

  const handleDelete = async () => {
      try {
          await apiDeletePost(post._id);
          onDelete(post._id);
      } catch (err) {
          console.error(err);
      }
  }

  useEffect(() => {
    if (!postRef.current || hasRecordedImpression.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasRecordedImpression.current) {
          hasRecordedImpression.current = true;
          recordImpression(post._id)
            .then(res => {
              if (res?.data?.impressionCount !== undefined) {
                setImpressionCount(res.data.impressionCount);
              }
            })
            .catch(err => console.error(err));
        }
      });
    }, { threshold: 0.6 });

    observer.observe(postRef.current);

    return () => observer.disconnect();
  }, [post._id]);

  if (!post.user) return null;

  // Get latest education or headline
  const userSubtitle = post.user.education && post.user.education.length > 0 
    ? post.user.education[0].school 
    : (post.user.headline || 'Member');

  return (
    <div ref={postRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <Link to={`/profile/${post.user._id}`}>
            <img
              src={post.user.avatarUrl || 'https://via.placeholder.com/40'}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          </Link>
          <div>
            <Link to={`/profile/${post.user._id}`} className="hover:underline">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{post.user.name}</h4>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">{userSubtitle}</p>
            <p className="text-xs text-gray-400">{moment(post.createdAt).fromNow()}</p>
          </div>
        </div>
        {isOwner && (
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-500">
                <Trash2 size={18} />
            </button>
        )}
      </div>

      <p className="text-gray-800 dark:text-gray-300 text-sm mb-4 whitespace-pre-wrap">{post.content}</p>

      {(post.mediaUrl || post.image) && (
        post.mediaType === 'video' ? (
          <video
            src={post.mediaUrl || post.image}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-lg mb-4"
          />
        ) : (
          <img src={post.mediaUrl || post.image} alt="Post content" className="w-full rounded-lg mb-4" />
        )
      )}

      <div className="flex items-center space-x-6 border-t border-gray-100 dark:border-gray-700 pt-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 text-sm font-medium ${
            isLiked ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          <span>{likes.length} Likes</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <MessageCircle size={18} />
          <span>{comments.length} Comments</span>
        </button>
        {isOwner && (
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {impressionCount} Views
          </div>
        )}
      </div>

      {showComments && (
        <div className="mt-4 space-y-6">
          <form onSubmit={handleComment} className="flex space-x-2 mb-6">
            <img 
                src={authUser?.avatarUrl || 'https://via.placeholder.com/30'} 
                alt="" 
                className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 relative">
                <input
                type="text"
                className="w-full px-4 py-2 border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none text-sm bg-transparent dark:text-gray-100 transition-colors"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                required
                />
                <div className="flex justify-end mt-2">
                    <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    Comment
                    </button>
                </div>
            </div>
          </form>

          {comments.map(comment => (
            <CommentItem 
                key={comment._id}
                comment={comment}
                postId={post._id}
                authUser={authUser}
                onDelete={deleteComment}
                activeReplyId={activeReplyId}
                setActiveReplyId={setActiveReplyId}
                replyText={replyText}
                setReplyText={setReplyText}
                handleReplySubmit={handleReplySubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PostItem;
