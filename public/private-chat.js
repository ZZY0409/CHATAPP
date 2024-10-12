const { ipcRenderer } = require('electron');

console.log('Private chat script loaded');

const friendNameElement = document.getElementById('friend-name');
const privateMessagesElement = document.getElementById('private-messages');
const privateMessageInput = document.getElementById('private-message-input');
const sendPrivateBtn = document.getElementById('send-private-btn');

let currentUser, friend;

ipcRenderer.on('chat-info', (event, info) => {
    console.log('Received chat info:', info);
    currentUser = info.currentUser;
    friend = info.friend;
    friendNameElement.textContent = friend;

    // 请求聊天历史
    ipcRenderer.send('get-private-chat-history', { from: currentUser, to: friend });
});

sendPrivateBtn.addEventListener('click', sendMessage);
privateMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const message = privateMessageInput.value.trim();
    if (message) {
        sendPrivateMessage(message);
        privateMessageInput.value = '';
    }
}

function sendPrivateMessage(message) {
    ipcRenderer.send('send-private-message', { from: currentUser, to: friend, message });
    appendMessage(currentUser, message, true);
}

function appendMessage(from, message, isOwnMessage) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = from + ': ';
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'message-content';
    messageSpan.textContent = message;

    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(messageSpan);
    
    privateMessagesElement.appendChild(messageElement);
    privateMessagesElement.scrollTop = privateMessagesElement.scrollHeight;
}

ipcRenderer.on('private message', (event, msg) => {
    console.log('Received private message:', msg);
    appendMessage(msg.from, msg.message, msg.from === currentUser);
});

ipcRenderer.on('private chat history', (event, messages) => {
    console.log('Received chat history:', messages);
    privateMessagesElement.innerHTML = '';
    messages.forEach(msg => {
        appendMessage(msg.from, msg.message, msg.from === currentUser);
    });
});