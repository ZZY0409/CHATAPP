const useElectronAPI = () => {
  const login = (data) => {
    if (window.electronAPI && window.electronAPI.login) {
      return window.electronAPI.login(data);
    }
    console.error('electronAPI.login is not available');
    return Promise.reject(new Error('electronAPI.login is not available'));
  };

  const register = (data) => {
    if (window.electronAPI && window.electronAPI.register) {
      return window.electronAPI.register(data);
    }
    console.error('electronAPI.register is not available');
    return Promise.reject(new Error('electronAPI.register is not available'));
  };

  const getFriends = (data) => {
    if (window.electronAPI && window.electronAPI.getFriends) {
      return window.electronAPI.getFriends(data);
    }
    console.error('electronAPI.getFriends is not available');
  };

  const getFriendRequests = (data) => {
    if (window.electronAPI && window.electronAPI.getFriendRequests) {
      return window.electronAPI.getFriendRequests(data);
    }
    console.error('electronAPI.getFriendRequests is not available');
  };

  const sendChatMessage = (data) => {
    if (window.electronAPI && window.electronAPI.sendChatMessage) {
      return window.electronAPI.sendChatMessage(data);
    }
    console.error('electronAPI.sendChatMessage is not available');
  };

  const sendPrivateMessage = (data) => {
    if (window.electronAPI && window.electronAPI.sendPrivateMessage) {
      return window.electronAPI.sendPrivateMessage(data);
    }
    console.error('electronAPI.sendPrivateMessage is not available');
  };

  const addFriend = (data) => {
    if (window.electronAPI && window.electronAPI.addFriend) {
      return window.electronAPI.addFriend(data);
    }
    console.error('electronAPI.addFriend is not available');
  };

  const acceptFriendRequest = (data) => {
    if (window.electronAPI && window.electronAPI.acceptFriendRequest) {
      return window.electronAPI.acceptFriendRequest(data);
    }
    console.error('electronAPI.acceptFriendRequest is not available');
  };

  const loadPrivateChat = (data) => {
    if (window.electronAPI && window.electronAPI.loadPrivateChat) {
      return window.electronAPI.loadPrivateChat(data);
    }
    console.error('electronAPI.loadPrivateChat is not available');
  };

  const logout = (data) => {
    if (window.electronAPI && window.electronAPI.logout) {
      return window.electronAPI.logout(data);
    }
    console.error('electronAPI.logout is not available');
  };

  const sendFriendRequest = (data) => {
    if (window.electronAPI && window.electronAPI.sendFriendRequest) {
      return window.electronAPI.sendFriendRequest(data);
    }
    console.error('electronAPI.sendFriendRequest is not available');
  };

  const getChromeHistory = (limit) => {
    if (window.electronAPI && window.electronAPI.getChromeHistory) {
      return window.electronAPI.getChromeHistory(limit);
    }
    console.error('electronAPI.getChromeHistory is not available');
    return Promise.reject(new Error('electronAPI.getChromeHistory is not available'));
  };

  const getUserInfo = (username) => {
    if (window.electronAPI && window.electronAPI.getUserInfo) {
      return window.electronAPI.getUserInfo(username);
    }
    console.error('electronAPI.getUserInfo is not available');
    return Promise.reject(new Error('electronAPI.getUserInfo is not available'));
  };

  // Event listeners
  const onServerConnected = (callback) => {
    if (window.electronAPI && window.electronAPI.onServerConnected) {
      return window.electronAPI.onServerConnected(callback);
    }
    console.error('electronAPI.onServerConnected is not available');
  };

  const onChatMessage = (callback) => {
    if (window.electronAPI && window.electronAPI.onChatMessage) {
      return window.electronAPI.onChatMessage(callback);
    }
    console.error('electronAPI.onChatMessage is not available');
  };

  const onPrivateMessage = (callback) => {
    if (window.electronAPI && window.electronAPI.onPrivateMessage) {
      return window.electronAPI.onPrivateMessage(callback);
    }
    console.error('electronAPI.onPrivateMessage is not available');
  };

  const onFriendAdded = (callback) => {
    if (window.electronAPI && window.electronAPI.onFriendAdded) {
      return window.electronAPI.onFriendAdded(callback);
    }
    console.error('electronAPI.onFriendAdded is not available');
  };

  const onUpdatePoints = (callback) => {
    if (window.electronAPI && window.electronAPI.onUpdatePoints) {
      return window.electronAPI.onUpdatePoints(callback);
    }
    console.error('electronAPI.onUpdatePoints is not available');
  };

  const onUpdateFriends = (callback) => {
    if (window.electronAPI && window.electronAPI.onUpdateFriends) {
      return window.electronAPI.onUpdateFriends(callback);
    }
    console.error('electronAPI.onUpdateFriends is not available');
  };

  const onUserConnected = (callback) => {
    if (window.electronAPI && window.electronAPI.onUserConnected) {
      return window.electronAPI.onUserConnected(callback);
    }
    console.error('electronAPI.onUserConnected is not available');
  };

  const onUserDisconnected = (callback) => {
    if (window.electronAPI && window.electronAPI.onUserDisconnected) {
      return window.electronAPI.onUserDisconnected(callback);
    }
    console.error('electronAPI.onUserDisconnected is not available');
  };

  const onPrivateChatHistory = (callback) => {
    if (window.electronAPI && window.electronAPI.onPrivateChatHistory) {
      return window.electronAPI.onPrivateChatHistory(callback);
    }
    console.error('electronAPI.onPrivateChatHistory is not available');
  };

  const onFriendRequest = (callback) => {
    if (window.electronAPI && window.electronAPI.onFriendRequest) {
      return window.electronAPI.onFriendRequest(callback);
    }
    console.error('electronAPI.onFriendRequest is not available');
  };

  const onUpdateFriendRequests = (callback) => {
    if (window.electronAPI && window.electronAPI.onUpdateFriendRequests) {
      return window.electronAPI.onUpdateFriendRequests(callback);
    }
    console.error('electronAPI.onUpdateFriendRequests is not available');
  };

  return {
    login,
    register,
    getFriends,
    getFriendRequests,
    sendChatMessage,
    sendPrivateMessage,
    addFriend,
    acceptFriendRequest,
    loadPrivateChat,
    logout,
    sendFriendRequest,
    getChromeHistory,
    getUserInfo,
    onServerConnected,
    onChatMessage,
    onPrivateMessage,
    onFriendAdded,
    onUpdatePoints,
    onUpdateFriends,
    onUserConnected,
    onUserDisconnected,
    onPrivateChatHistory,
    onFriendRequest,
    onUpdateFriendRequests
  };
};

export default useElectronAPI;