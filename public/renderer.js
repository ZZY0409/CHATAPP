const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  const loginRegisterContainer = document.getElementById('login-register-container');
  const homeContainer = document.getElementById('home-container');
  const groupChatContainer = document.getElementById('group-chat-container');
  const privateChatContainer = document.getElementById('private-chat-container');
  const browserHistoryContainer = document.getElementById('browser-history-container');

  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const logoutButton = document.getElementById('logout-button');
  const groupChatButton = document.getElementById('group-chat-button');
  const showBrowserHistoryButton = document.getElementById('show-browser-history');
  const sendGroupMessageButton = document.getElementById('send-group-message');
  const sendPrivateMessageButton = document.getElementById('send-private-message');
  const addFriendButton = document.getElementById('add-friend-button');

  const usernameDisplay = document.getElementById('username-display');
  const pointsDisplay = document.getElementById('points-display');
  const friendsList = document.getElementById('friends');
  const friendRequestsList = document.getElementById('friend-requests');

  let currentUser = null;

  showRegister.addEventListener('click', () => {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
  });

  showLogin.addEventListener('click', () => {
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
  });

  registerButton.addEventListener('click', async () => {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const bio = document.getElementById('register-bio').value.trim();
    if (username && password) {
      try {
        const result = await ipcRenderer.invoke('register', { username, password, email, bio });
        if (result.success) {
          alert(result.message);
          document.getElementById('register-container').style.display = 'none';
          document.getElementById('login-container').style.display = 'block';
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration. Please try again.');
      }
    }
  });

  loginButton.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (username && password) {
      try {
        const result = await ipcRenderer.invoke('login', { username, password });
        if (result.success) {
          currentUser = username;
          loginRegisterContainer.style.display = 'none';
          homeContainer.style.display = 'block';
          usernameDisplay.textContent = username;
          ipcRenderer.send('get friends', { username });
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
      }
    }
  });

  logoutButton.addEventListener('click', () => {
    ipcRenderer.send('logout', { username: currentUser });
    currentUser = null;
    homeContainer.style.display = 'none';
    loginRegisterContainer.style.display = 'block';
  });

  groupChatButton.addEventListener('click', () => {
    homeContainer.style.display = 'none';
    groupChatContainer.style.display = 'block';
  });

  sendGroupMessageButton.addEventListener('click', () => {
    const message = document.getElementById('group-message').value.trim();
    if (currentUser && message) {
      ipcRenderer.send('chat message', { username: currentUser, message });
      document.getElementById('group-message').value = '';
    }
  });

  sendPrivateMessageButton.addEventListener('click', () => {
    const message = document.getElementById('private-message').value.trim();
    const to = document.getElementById('private-chat-username').textContent;
    if (currentUser && message && to) {
      ipcRenderer.send('send-private-message', { from: currentUser, to, message });
      document.getElementById('private-message').value = '';
    }
  });

  addFriendButton.addEventListener('click', () => {
    const friendUsername = document.getElementById('friend-username').value.trim();
    if (currentUser && friendUsername) {
      ipcRenderer.send('add friend', { username: currentUser, friend: friendUsername });
    }
  });

  showBrowserHistoryButton.addEventListener('click', async () => {
    try {
      console.log('Fetching browser history...');
      const history = await ipcRenderer.invoke('get-chrome-history');
      console.log('Browser history received:', history);
      displayBrowserHistory(history);
    } catch (error) {
      console.error('Error fetching browser history:', error);
    }
  });

  function displayBrowserHistory(history) {
    browserHistoryContainer.innerHTML = '<h3>Browser History</h3>';
    const ul = document.createElement('ul');
    history.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.title} - ${item.url} (${new Date(item.lastVisit).toLocaleString()})`;
      ul.appendChild(li);
    });
    browserHistoryContainer.appendChild(ul);
    browserHistoryContainer.style.display = 'block';
    homeContainer.style.display = 'none';
  }

  ipcRenderer.on('chat message', (event, msg) => {
    appendMessage(groupChatContainer.querySelector('.messages-container'), msg, msg.username === currentUser);
  });

  ipcRenderer.on('private message', (event, msg) => {
    if (privateChatContainer.style.display === 'block' &&
        (msg.from === document.getElementById('private-chat-username').textContent || msg.to === document.getElementById('private-chat-username').textContent)) {
      appendMessage(privateChatContainer.querySelector('.messages-container'), { username: msg.from, message: msg.message }, msg.from === currentUser);
    }
  });

  ipcRenderer.on('friend added', (event, data) => {
    alert(`${data.friend} has been added to your friends list.`);
    addFriendToList(data.friend);
  });

  ipcRenderer.on('update points', (event, data) => {
    if (data.username === currentUser) {
      pointsDisplay.textContent = `Points: ${data.points}`;
    }
  });

  ipcRenderer.on('update friends', (event, data) => {
    if (data.username === currentUser) {
      friendsList.innerHTML = '';
      data.friends.forEach(friend => addFriendToList(friend));
    }
  });

  function appendMessage(container, msg, isOwnMessage) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    messageElement.textContent = `${msg.username}: ${msg.message}`;
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
  }

  function addFriendToList(friend) {
    const friendItem = document.createElement('li');
    friendItem.textContent = friend;
    friendItem.dataset.username = friend;
    friendItem.innerHTML += ' <button class="view-info">View Info</button>';
    friendItem.querySelector('.view-info').addEventListener('click', (e) => {
      e.stopPropagation();
      openUserPopup(friend);
    });
    friendItem.addEventListener('click', () => {
      openPrivateChat(friend);
    });
    friendsList.appendChild(friendItem);
  }

  function openPrivateChat(friend) {
    document.getElementById('private-chat-username').textContent = friend;
    homeContainer.style.display = 'none';
    privateChatContainer.style.display = 'block';
    ipcRenderer.send('load private chat', { from: currentUser, to: friend });
  }

  function openUserPopup(username) {
    ipcRenderer.invoke('get user info', username)
      .then(data => {
        document.getElementById('popup-username').textContent = `Username: ${data.username}`;
        document.getElementById('popup-email').textContent = `Email: ${data.email}`;
        document.getElementById('popup-bio').textContent = `Bio: ${data.bio}`;
        document.getElementById('add-friend-button-popup').dataset.username = data.username;
        document.getElementById('user-popup').style.display = 'flex';
      })
      .catch(error => {
        console.error('Error fetching user info:', error);
        alert('Failed to fetch user information');
      });
  }

  document.querySelector('.close-popup').addEventListener('click', () => {
    document.getElementById('user-popup').style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('user-popup')) {
      document.getElementById('user-popup').style.display = 'none';
    }
  });

  document.getElementById('add-friend-button-popup').addEventListener('click', (e) => {
    const friendUsername = e.target.dataset.username;
    if (currentUser && friendUsername && friendUsername !== currentUser) {
      ipcRenderer.send('add friend', { username: currentUser, friend: friendUsername });
      document.getElementById('user-popup').style.display = 'none';
    }
  });

  ipcRenderer.on('private chat history', (event, messages) => {
    const privateMessagesContainer = privateChatContainer.querySelector('.messages-container');
    privateMessagesContainer.innerHTML = '';
    messages.forEach(msg => {
      appendMessage(privateMessagesContainer, { username: msg.from, message: msg.message }, msg.from === currentUser);
    });
  });

  ipcRenderer.on('friend request', (event, data) => {
    const requestItem = document.createElement('li');
    requestItem.textContent = `${data.from} wants to be your friend`;
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.addEventListener('click', () => {
      ipcRenderer.send('accept friend request', { from: currentUser, to: data.from });
      requestItem.remove();
    });
    requestItem.appendChild(acceptButton);
    friendRequestsList.appendChild(requestItem);
  });

  ipcRenderer.on('user connected', (event, username) => {
    const friendItem = friendsList.querySelector(`li[data-username="${username}"]`);
    if (friendItem) {
      friendItem.classList.add('online');
    }
  });

  ipcRenderer.on('user disconnected', (event, username) => {
    const friendItem = friendsList.querySelector(`li[data-username="${username}"]`);
    if (friendItem) {
      friendItem.classList.remove('online');
    }
  });

  document.getElementById('back-to-home').addEventListener('click', () => {
    groupChatContainer.style.display = 'none';
    homeContainer.style.display = 'block';
  });

  document.getElementById('back-to-home-private').addEventListener('click', () => {
    privateChatContainer.style.display = 'none';
    homeContainer.style.display = 'block';
  });

  function backToHomeFromHistory() {
    browserHistoryContainer.style.display = 'none';
    homeContainer.style.display = 'block';
  }

  const backButton = document.createElement('button');
  backButton.textContent = 'Back to Home';
  backButton.addEventListener('click', backToHomeFromHistory);
  browserHistoryContainer.appendChild(backButton);

  console.log('All event listeners set up');
});