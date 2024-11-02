import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle, Users, BookOpen } from 'lucide-react';
import ThemeSwitcher from './components/ThemeSwitcher';
import ChatInterface from './components/ChatInterface';
import Moments from './components/Moments';
import useElectronAPI from './hooks/useElectronAPI';
import './App.css';

const App = () => {
  // State management
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [points, setPoints] = useState(0);
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [userPopup, setUserPopup] = useState({ show: false, user: null });
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Electron API hooks
  const {
    login: electronLogin,
    register: electronRegister,
    getFriends,
    getFriendRequests,
    sendChatMessage,
    sendPrivateMessage,
    acceptFriendRequest: electronAcceptFriendRequest,
    loadPrivateChat,
    logout: electronLogout,
    sendFriendRequest: electronSendFriendRequest,
    getChromeHistory,
    getUserInfo,
    onChatMessage,
    onPrivateMessage,
    onFriendAdded,
    onUpdatePoints,
    onUpdateFriends,
    onFriendRequest,
    onUpdateFriendRequests,
    // 朋友圈相关 API
    getMoments,
    createMoment,
    getMomentComments,
    createMomentComment
  } = useElectronAPI();

  // Ref for component mounted state
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Notification handler
  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      if (isMounted.current) {
        setNotification({ show: false, message: '', type: '' });
      }
    }, 3000);
  };

  // Login handler
  const handleLogin = async (username, password) => {
    try {
      setIsLoading(true);
      const result = await electronLogin({ username, password });
      
      if (result.success) {
        setCurrentUser(username);
        setFriends(result.user?.friends || []);
        setPoints(result.user?.points || 0);
        setView('home');
        showNotification('Login successful', 'success');
      } else {
        showNotification(result.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('An error occurred during login', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (formData) => {
    try {
      setIsLoading(true);
      const result = await electronRegister(formData);
      
      if (result.success) {
        showNotification('Registration successful', 'success');
        setView('login');
      } else {
        showNotification(result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showNotification('An error occurred during registration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Friend request handler
  const handleSendFriendRequest = async (username) => {
    if (!username.trim() || friends.includes(username)) {
      showNotification('Invalid username or already friends', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await electronSendFriendRequest({ from: currentUser, to: username });
      showNotification('Friend request sent', 'success');
      setNewFriendUsername('');
    } catch (error) {
      console.error('Friend request error:', error);
      showNotification('Failed to send friend request', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Accept friend request handler
  const handleAcceptFriendRequest = async (username) => {
    try {
      await electronAcceptFriendRequest({ from: username, to: currentUser });
      setFriendRequests(prev => prev.filter(request => request !== username));
      showNotification('Friend request accepted', 'success');
    } catch (error) {
      console.error('Accept friend request error:', error);
      showNotification('Failed to accept friend request', 'error');
    }
  };

  // Logout handler
  const handleLogout = () => {
    electronLogout({ username: currentUser });
    setCurrentUser(null);
    setFriends([]);
    setFriendRequests([]);
    setPoints(0);
    setView('login');
    showNotification('Logged out successfully', 'success');
  };

  // Chat message handler
  const handleSendMessage = async (messageData) => {
    try {
      if (messageData.to) {
        await sendPrivateMessage(messageData);
      } else {
        await sendChatMessage(messageData);
      }
    } catch (error) {
      console.error('Send message error:', error);
      showNotification('Failed to send message', 'error');
    }
  };

  // Event listeners
  useEffect(() => {
    if (!currentUser) return;

    const cleanupFns = [
      onChatMessage((msg) => {
        // Handle chat message
      }),
      onPrivateMessage((msg) => {
        // Handle private message
      }),
      onFriendAdded((data) => {
        if (isMounted.current) {
          setFriends(prev => Array.from(new Set([...prev, data])));
        }
      }),
      onUpdatePoints((data) => {
        if (isMounted.current) {
          setPoints(typeof data === 'object' ? data.points : data);
        }
      }),
      onFriendRequest((data) => {
        if (isMounted.current && data.to === currentUser) {
          setFriendRequests(prev => Array.from(new Set([...prev, data.from])));
          showNotification(`New friend request from ${data.from}`, 'info');
        }
      }),
      onUpdateFriends(({ username, friends }) => {
        if (isMounted.current && username === currentUser) {
          setFriends(Array.from(new Set(friends)));
        }
      }),
      onUpdateFriendRequests(({ username, friendRequests }) => {
        if (isMounted.current && username === currentUser) {
          setFriendRequests(Array.from(new Set(friendRequests)));
        }
      })
    ];

    // Initial data fetch
    getFriends({ username: currentUser });
    getFriendRequests({ username: currentUser });

    return () => {
      cleanupFns.forEach(cleanup => cleanup?.());
    };
  }, [currentUser]);

  // Render functions
  const renderLogin = () => (
    <div className="card login-container">
      <h2>Login</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        handleLogin(formData.get('username'), formData.get('password'));
      }}>
        <div className="form-group">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-control"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-center mt-4">
        Don't have an account?{' '}
        <button
          onClick={() => setView('register')}
          className="text-primary hover:underline"
        >
          Register
        </button>
      </p>
    </div>
  );

  const renderRegister = () => (
    <div className="card register-container">
      <h2>Register</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        handleRegister({
          username: formData.get('username'),
          password: formData.get('password'),
          email: formData.get('email'),
          bio: formData.get('bio')
        });
      }}>
        <div className="form-group">
          <label htmlFor="reg-username" className="form-label">Username</label>
          <input
            type="text"
            id="reg-username"
            name="username"
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-password" className="form-label">Password</label>
          <input
            type="password"
            id="reg-password"
            name="password"
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea
            id="bio"
            name="bio"
            className="form-control"
            rows="3"
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-center mt-4">
        Already have an account?{' '}
        <button
          onClick={() => setView('login')}
          className="text-primary hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );

  const renderHome = () => (
    <div className="home-container">
      <div className="card user-info">
        <div className="flex justify-between items-center">
          <div>
            <h2>Welcome, {currentUser}</h2>
            <p className="points">Points: {points}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="card friend-section">
        <h3>Add Friend</h3>
        <div className="add-friend-form">
          <input
            type="text"
            value={newFriendUsername}
            onChange={(e) => setNewFriendUsername(e.target.value)}
            placeholder="Enter username"
            className="form-control"
          />
          <button
            onClick={() => handleSendFriendRequest(newFriendUsername)}
            className="btn btn-primary"
            disabled={isLoading || !newFriendUsername.trim()}
          >
            Add Friend
          </button>
        </div>
      </div>

      {/* 功能区 */}
      <div className="card">
        <h3>功能区</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setView('groupChat')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Users size={20} />
            群聊
          </button>
          <button
            onClick={() => setView('moments')}
            className="btn btn-primary flex items-center gap-2"
          >
            <BookOpen size={20} />
            朋友圈
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3>Friends</h3>
          <div className="friend-list">
            {friends.length > 0 ? (
              friends.map((friend, index) => (
                <div key={`${friend}-${index}`} className="friend-item">
                  <span>{friend}</span>
                  <div className="friend-actions">
                    <button
                      onClick={() => {
                        setPrivateChatUser(friend);
                        setView('privateChat');
                        loadPrivateChat({ from: currentUser, to: friend });
                      }}
                      className="btn btn-secondary"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No friends yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Friend Requests</h3>
          <div className="friend-requests">
            {friendRequests.length > 0 ? (
              friendRequests.map((request, index) => (
                <div key={`${request}-${index}`} className="friend-request-item">
                  <span>{request}</span>
                  <button
                    onClick={() => handleAcceptFriendRequest(request)}
                    className="btn btn-primary"
                  >
                    Accept
                  </button>
                </div>
              ))
            ) : (
              <p>No friend requests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <ChatInterface
      currentUser={currentUser}
      isGroup={!privateChatUser}
      recipient={privateChatUser}
      sendMessage={handleSendMessage}
      onBack={() => {
        setPrivateChatUser(null);
        setView('home');
      }}
    />
  );

  const renderMoments = () => (
    <div className="moments-view">
      <Moments
        currentUser={currentUser}
        friends={friends}
        onBack={() => setView('home')}
        showNotification={showNotification}
      />
    </div>
  );

  // Main render
  return (
    <div className="app">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {(() => {
        switch (view) {
          case 'login':
            return renderLogin();
            case 'register':
              return renderRegister();
            case 'home':
              return renderHome();
            case 'privateChat':
              return renderChat();
            case 'groupChat':
              return (
                <div className="chat-view">
                  <ChatInterface
                    currentUser={currentUser}
                    isGroup={true}
                    sendMessage={handleSendMessage}
                    onBack={() => setView('home')}
                  />
                </div>
              );
            case 'moments':
              return renderMoments();
            default:
              return null;
          }
        })()}
  
        <ThemeSwitcher />
  
        {userPopup.show && userPopup.user && (
          <div className="popup-overlay">
            <div className="popup">
              <div className="popup-content">
                <span 
                  className="close-popup" 
                  onClick={() => setUserPopup({ show: false, user: null })}
                  aria-label="Close popup"
                >
                  ×
                </span>
                <h2>User Info</h2>
                <div className="user-info">
                  <p><strong>Username:</strong> {userPopup.user.username}</p>
                  <p><strong>Email:</strong> {userPopup.user.email}</p>
                  <p><strong>Bio:</strong> {userPopup.user.bio}</p>
                </div>
                {!friends.includes(userPopup.user.username) && (
                  <button 
                    className="btn btn-primary mt-4"
                    onClick={() => handleSendFriendRequest(userPopup.user.username)}
                    disabled={friendRequests.includes(userPopup.user.username)}
                  >
                    {friendRequests.includes(userPopup.user.username) 
                      ? 'Friend Request Sent' 
                      : 'Add Friend'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default App;