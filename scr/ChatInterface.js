import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Mic, StopCircle } from 'lucide-react';

const { ipcRenderer } = window.require('electron');

const ChatInterface = ({ currentUser, isGroup, recipient }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleChatMessage = (event, msg) => {
      if (isGroup || msg.from === recipient || msg.from === currentUser) {
        setMessages(prevMessages => [...prevMessages, msg]);
      }
    };

    const handlePrivateChatHistory = (event, history) => {
      setMessages(history);
    };

    ipcRenderer.on('chat message', handleChatMessage);
    ipcRenderer.on('private message', handleChatMessage);
    ipcRenderer.on('private chat history', handlePrivateChatHistory);

    if (!isGroup) {
      ipcRenderer.send('load private chat', { from: currentUser, to: recipient });
    }

    return () => {
      ipcRenderer.removeListener('chat message', handleChatMessage);
      ipcRenderer.removeListener('private message', handleChatMessage);
      ipcRenderer.removeListener('private chat history', handlePrivateChatHistory);
    };
  }, [currentUser, isGroup, recipient]);

  const sendMessage = (content, type = 'text') => {
    if (content) {
      let messageData;
      if (type === 'audio') {
        // 为音频消息创建一个 Blob URL
        const audioUrl = URL.createObjectURL(content);
        messageData = {
          from: currentUser,
          message: audioUrl,
          type: 'audio',
          timestamp: new Date().toISOString()
        };
      } else {
        messageData = {
          from: currentUser,
          message: content,
          type: 'text',
          timestamp: new Date().toISOString()
        };
      }

      if (isGroup) {
        ipcRenderer.send('chat message', messageData);
      } else {
        ipcRenderer.send('private message', { ...messageData, to: recipient });
      }

      setInputMessage('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
        }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendMessage(audioBlob, 'audio');
        setAudioChunks([]);
      };
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div key={`${msg.from}-${index}-${msg.timestamp}`} className={`mb-2 ${msg.from === currentUser ? 'text-right' : 'text-left'}`}>
            <span className="inline-block bg-white rounded px-2 py-1">
              <strong>{msg.from}: </strong>
              {msg.type === 'text' ? (
                msg.message
              ) : (
                <audio controls src={msg.message} />
              )}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="bg-white p-4 flex items-center">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
          className="flex-1 border rounded px-2 py-1 mr-2"
          placeholder="Type a message..."
        />
        <button onClick={() => sendMessage(inputMessage)} className="bg-green-500 text-white rounded p-2 mr-2">
          <Send size={20} />
        </button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white rounded p-2`}
        >
          {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;