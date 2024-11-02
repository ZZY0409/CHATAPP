import React, { useState, useEffect } from 'react';
import { Image, MessageCircle, Heart, Send, Lock, Users, Globe } from 'lucide-react';

const Moments = ({ currentUser, electronAPI }) => {
  const [moments, setMoments] = useState([]);
  const [newMoment, setNewMoment] = useState({
    content: '',
    visibility: 'public', // public, friends, private
    image: null
  });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showComments, setShowComments] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // 获取朋友圈数据
  useEffect(() => {
    fetchMoments();
  }, [currentUser]);

  const fetchMoments = async () => {
    try {
      setIsLoading(true);
      const response = await electronAPI.getMoments();
      setMoments(response);
      
      // 获取每个动态的评论
      response.forEach(moment => {
        fetchComments(moment._id);
      });
    } catch (error) {
      console.error('获取朋友圈失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (momentId) => {
    try {
      const response = await electronAPI.getMomentComments(momentId);
      setComments(prev => ({
        ...prev,
        [momentId]: response
      }));
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewMoment(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmitMoment = async () => {
    if (!newMoment.content.trim() && !newMoment.image) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('content', newMoment.content);
      formData.append('visibility', newMoment.visibility);
      if (newMoment.image) {
        formData.append('image', newMoment.image);
      }

      await electronAPI.createMoment(formData);
      setNewMoment({
        content: '',
        visibility: 'public',
        image: null
      });
      fetchMoments();
    } catch (error) {
      console.error('发布朋友圈失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (momentId) => {
    if (!newComment[momentId]?.trim()) return;

    try {
      await electronAPI.createMomentComment(momentId, {
        content: newComment[momentId]
      });
      setNewComment(prev => ({
        ...prev,
        [momentId]: ''
      }));
      fetchComments(momentId);
    } catch (error) {
      console.error('发表评论失败:', error);
    }
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'private':
        return <Lock size={16} />;
      case 'friends':
        return <Users size={16} />;
      default:
        return <Globe size={16} />;
    }
  };

  return (
    <div className="moments-container">
      {/* 发布新动态 */}
      <div className="new-moment-card">
        <textarea
          value={newMoment.content}
          onChange={(e) => setNewMoment(prev => ({...prev, content: e.target.value}))}
          placeholder="分享新动态..."
          className="moment-input"
        />
        <div className="moment-actions">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              id="moment-image"
              className="hidden-input"
            />
            <label htmlFor="moment-image" className="file-input-label">
              <Image size={20} />
              添加图片
            </label>
          </div>
          <select
            value={newMoment.visibility}
            onChange={(e) => setNewMoment(prev => ({...prev, visibility: e.target.value}))}
            className="visibility-select"
          >
            <option value="public">公开</option>
            <option value="friends">仅好友可见</option>
            <option value="private">仅自己可见</option>
          </select>
          <button 
            onClick={handleSubmitMoment}
            disabled={isLoading || (!newMoment.content.trim() && !newMoment.image)}
            className="submit-button"
          >
            发布
          </button>
        </div>
        {newMoment.image && (
          <div className="image-preview">
            <img 
              src={URL.createObjectURL(newMoment.image)} 
              alt="预览" 
              className="preview-image"
            />
            <button
              onClick={() => setNewMoment(prev => ({...prev, image: null}))}
              className="remove-image"
            >
              移除图片
            </button>
          </div>
        )}
      </div>

      {/* 朋友圈列表 */}
      <div className="moments-list">
        {moments.map(moment => (
          <div key={moment._id} className="moment-card">
            <div className="moment-header">
              <div className="user-info">
                <span className="username">{moment.user.username}</span>
                <span className="visibility">
                  {getVisibilityIcon(moment.visibility)}
                </span>
              </div>
              <span className="timestamp">
                {new Date(moment.createdAt).toLocaleString()}
              </span>
            </div>
            
            <div className="moment-content">
              {moment.content}
              {moment.image && (
                <img 
                  src={moment.image} 
                  alt="动态图片" 
                  className="moment-image"
                />
              )}
            </div>

            <div className="moment-footer">
              <button 
                className="action-button"
                onClick={() => setShowComments(prev => ({
                  ...prev,
                  [moment._id]: !prev[moment._id]
                }))}
              >
                <MessageCircle size={20} />
                {comments[moment._id]?.length || 0}
              </button>
              <button className="action-button">
                <Heart size={20} />
                0
              </button>
            </div>

            {/* 评论区 */}
            {showComments[moment._id] && (
              <div className="comments-section">
                {comments[moment._id]?.map(comment => (
                  <div key={comment._id} className="comment">
                    <span className="comment-user">{comment.user.username}:</span>
                    <span className="comment-content">{comment.content}</span>
                  </div>
                ))}
                <div className="new-comment">
                  <input
                    type="text"
                    value={newComment[moment._id] || ''}
                    onChange={(e) => setNewComment(prev => ({
                      ...prev,
                      [moment._id]: e.target.value
                    }))}
                    placeholder="发表评论..."
                    className="comment-input"
                  />
                  <button
                    onClick={() => handleSubmitComment(moment._id)}
                    disabled={!newComment[moment._id]?.trim()}
                    className="submit-comment"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Moments;