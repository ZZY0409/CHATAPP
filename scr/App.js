import React, { useState, useEffect } from 'react';
import BrowserHistory from './BrowserHistory';
import ChatInterface from './ChatInterface';
import axios from 'axios';

const { ipcRenderer } = window.require('electron');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [points, setPoints] = useState(0);
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [userPopup, setUserPopup] = useState({ show: false, user: null });
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [moments, setMoments] = useState([]);
  const [newMoment, setNewMoment] = useState({ content: '', visibility: 'public', image: null });

  useEffect(() => {
    const eventHandlers = {
      'chat message': (msg) => console.log('Received chat message:', msg),
      'private message': (msg) => console.log('Received private message:', msg),
      'friend added': (data) => {
        console.log('Friend added:', data);
        setFriends(prevFriends => {
          const newFriends = Array.isArray(prevFriends) ? [...prevFriends] : [];
          if (data && !newFriends.includes(data)) {
            newFriends.push(data);
          }
          console.log('Updated friends list:', newFriends);
          return [...new Set(newFriends)];
        });
      },
      'update points': (newPointsData) => {
        console.log('Points updated:', newPointsData);
        if (typeof newPointsData === 'object' && 'points' in newPointsData) {
          setPoints(newPointsData.points);
        } else if (typeof newPointsData === 'number') {
          setPoints(newPointsData);
        } else {
          console.error('Invalid points data received:', newPointsData);
        }
      },
      'friend request': (data) => {
        console.log('Received friend request:', data);
        if (data.to === currentUser) {
          setFriendRequests(prevRequests => {
            return [...new Set([...prevRequests, data.from])];
          });
          alert(`You have received a friend request from ${data.from}`);
        }
      },
      'friend request sent': (message) => {
        setIsLoading(false);
        alert(message);
      },
      'friend request error': (message) => {
        setIsLoading(false);
        alert(message);
      },
      'update friend requests': ({ username, friendRequests }) => {
        if (username === currentUser) {
          setFriendRequests(Array.isArray(friendRequests) ? friendRequests : []);
        }
      },
      'update friends': ({ username, friends }) => {
        if (username === currentUser) {
          setFriends([...new Set(friends)]);
        }
      },
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      ipcRenderer.on(event, (_, ...args) => handler(...args));
    });

    return () => {
      Object.keys(eventHandlers).forEach(event => {
        ipcRenderer.removeAllListeners(event);
      });
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setView('home');
      ipcRenderer.send('get friends', { username: currentUser });
      ipcRenderer.send('get friend requests', { username: currentUser });
      fetchMoments();
    }
  }, [currentUser]);

  const fetchMoments = async () => {
    try {
      const response = await axios.get(`${API_URL}/moments?username=${currentUser}`);
      setMoments(response.data);
    } catch (error) {
      console.error('Error fetching moments:', error);
    }
  };

  const createMoment = async () => {
    try {
      const formData = new FormData();
      formData.append('content', newMoment.content);
      formData.append('visibility', newMoment.visibility);
      formData.append('username', currentUser);
      if (newMoment.image) {
        formData.append('image', newMoment.image);
      }
      await axios.post(`${API_URL}/moments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewMoment({ content: '', visibility: 'public', image: null });
      fetchMoments();
    } catch (error) {
      console.error('Error creating moment:', error);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login:', { username, password });
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      console.log('Login result:', result);
      if (response.ok) {
        setCurrentUser(username);
        setFriends(result.user.friends);
        setPoints(result.user.points);
        ipcRenderer.send('login', { username });
        ipcRenderer.send('connect socket', { username });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login. Please try again.');
    }
  };

  const register = async (username, password, email, bio) => {
    try {
      console.log('Attempting registration:', { username, email, bio });
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, bio }),
      });
      const result = await response.json();
      console.log('Registration result:', result);
      if (response.ok) {
        alert(result.message);
        setView('login');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Register error:', error);
      alert('An error occurred during registration. Please try again.');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setFriends([]);
    setFriendRequests([]);
    setPoints(0);
    ipcRenderer.send('logout', { username: currentUser });
    setView('login');
  };

  const sendFriendRequest = (to) => {
    if (!to.trim() || friends.includes(to)) return;
    console.log(`Sending friend request from ${currentUser} to ${to}`);
    setIsLoading(true);
    ipcRenderer.send('send friend request', { from: currentUser, to });
    setNewFriendUsername('');
  };

  const acceptFriendRequest = (from) => {
    ipcRenderer.send('accept friend request', { from, to: currentUser });
    setFriendRequests(prevRequests => prevRequests.filter(request => request !== from));
  };

  const openPrivateChat = (friend) => {
    setPrivateChatUser(friend);
    setView('privateChat');
    ipcRenderer.send('load private chat', { from: currentUser, to: friend });
  };

  const openUserPopup = async (username) => {
    try {
      const response = await fetch(`${API_URL}/user/${username}`);
      if (response.ok) {
        const userData = await response.json();
        setUserPopup({ show: true, user: userData });
      } else {
        throw new Error('Failed to fetch user info');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      alert('Failed to fetch user information');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'login':
        return (
          <div id="login-container" className="container">
            <h2>Login</h2>
            <input id="login-username" placeholder="Username" />
            <input id="login-password" type="password" placeholder="Password" />
            <button onClick={() => {
              const username = document.getElementById('login-username').value;
              const password = document.getElementById('login-password').value;
              login(username, password);
            }}>Login</button>
            <p>Don't have an account? <span className="link" onClick={() => setView('register')}>Register</span></p>
          </div>
        );
      case 'register':
        return (
          <div id="register-container" className="container">
            <h2>Register</h2>
            <input id="register-username" placeholder="Username" />
            <input id="register-password" type="password" placeholder="Password" />
            <input id="register-email" type="email" placeholder="Email" />
            <textarea id="register-bio" placeholder="Bio"></textarea>
            <button onClick={() => {
              const username = document.getElementById('register-username').value;
              const password = document.getElementById('register-password').value;
              const email = document.getElementById('register-email').value;
              const bio = document.getElementById('register-bio').value;
              register(username, password, email, bio);
            }}>Register</button>
            <p>Already have an account? <span className="link" onClick={() => setView('login')}>Login</span></p>
          </div>
        );
        case 'home':
          return (
            <div id="home-container">
              <h2>Welcome, {currentUser}</h2>
              <p>Points: {points}</p>
              <div className="add-friend-section">
                <input
                  type="text"
                  placeholder="Enter username to add friend"
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
                  disabled={isLoading}
                />
                <button 
                  onClick={() => sendFriendRequest(newFriendUsername)}
                  disabled={isLoading || !newFriendUsername.trim()}
                >
                  {isLoading ? 'Sending...' : 'Add Friend'}
                </button>
              </div>
              <button onClick={() => setView('groupChat')}>Join Group Chat</button>
              <button onClick={() => setView('browserHistory')}>Show Browser History</button>
              <button onClick={() => setView('moments')}>Moments</button>
              <button onClick={logout}>Logout</button>
              <h3>Friends</h3>
              <ul className="friend-list">
                {friends.length > 0 ? friends.map((friend, index) => (
                  <li key={`${friend}-${index}`} className="friend-item">
                    {friend}
                    <div>
                      <button className="chat-button" onClick={() => openPrivateChat(friend)}>Chat</button>
                      <button onClick={() => openUserPopup(friend)}>View Info</button>
                    </div>
                  </li>
                )) : <li>No friends yet</li>}
              </ul>
              <h3>Friend Requests</h3>
              <ul>
                {friendRequests.length > 0 ? friendRequests.map((request, index) => (
                  <li key={`${request}-${index}`}>
                    {request}
                    <button onClick={() => acceptFriendRequest(request)}>Accept</button>
                  </li>
                )) : <li>No friend requests</li>}
              </ul>
            </div>
          );
        case 'groupChat':
          return (
            <div id="group-chat-container" className="chat-container">
              <h2>Group Chat</h2>
              <ChatInterface currentUser={currentUser} isGroup={true} />
              <button onClick={() => setView('home')}>Back to Home</button>
            </div>
          );
        case 'privateChat':
          return (
            <div id="private-chat-container" className="chat-container">
              <h2>Private Chat with {privateChatUser}</h2>
              <ChatInterface currentUser={currentUser} isGroup={false} recipient={privateChatUser} />
              <button onClick={() => setView('home')}>Back to Home</button>
            </div>
          );
        case 'browserHistory':
          return (
            <div id="browser-history-container">
              <BrowserHistory />
              <button onClick={() => setView('home')}>Back to Home</button>
            </div>
          );
        case 'moments':
          return (
            <div id="moments-container">
              <h2>Moments</h2>
              <div>
                <textarea
                  value={newMoment.content}
                  onChange={(e) => setNewMoment({...newMoment, content: e.target.value})}
                  placeholder="What's on your mind?"
                />
                <select
                  value={newMoment.visibility}
                  onChange={(e) => setNewMoment({...newMoment, visibility: e.target.value})}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                </select>
                <input
                  type="file"
                  onChange={(e) => setNewMoment({...newMoment, image: e.target.files[0]})}
                />
                <button onClick={createMoment}>Post</button>
              </div>
              <div>
                {moments.map((moment) => (
                  <div key={moment._id}>
                    <p>{moment.user.username}</p>
                    <p>{moment.content}</p>
                    {moment.image && <img src={`${API_URL}${moment.image}`} alt="Moment" />}
                    <p>{new Date(moment.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setView('home')}>Back to Home</button>
            </div>
          );
        default:
          return <div>Invalid view</div>;
      }
    };
  
    return (
      <div className="app">
        {renderView()}
        {userPopup.show && (
          <div className="popup">
            <div className="popup-content">
              <span className="close-popup" onClick={() => setUserPopup({ show: false, user: null })}>×</span>
              <h2>User Info</h2>
              <p>Username: {userPopup.user.username}</p>
              <p>Email: {userPopup.user.email}</p>
              <p>Bio: {userPopup.user.bio}</p>
              {!friends.includes(userPopup.user.username) && (
                <button onClick={() => sendFriendRequest(userPopup.user.username)}>
                  {friendRequests.includes(userPopup.user.username) ? 'Friend Request Sent' : 'Add Friend'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default App;