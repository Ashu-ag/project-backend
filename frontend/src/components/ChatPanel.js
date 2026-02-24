import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Megaphone, Users } from 'lucide-react';
import io from 'socket.io-client';

const ChatPanel = ({ classId, classData }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    
    // Initialize Socket.io
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join classroom
    newSocket.emit('join-classroom', classId);

    // Listen for new messages
    newSocket.on('new-message', (data) => {
      if (data.classId === classId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    // Listen for announcements
    newSocket.on('new-announcement', (data) => {
      if (data.classId === classId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [classId]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/messages/class/${classId}`);
      setMessages(response.data.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post('/messages/send', {
        classId,
        content: newMessage,
        isAnnouncement: isAnnouncement && user.role === 'teacher'
      });

      setNewMessage('');
      setIsAnnouncement(false);
      
      // Message will be added via socket event
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Class Chat
          </h3>
          {user.role === 'teacher' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="announcement"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="announcement" className="flex items-center text-sm text-gray-700">
                <Megaphone className="w-4 h-4 mr-1" />
                Announcement
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="h-96 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender._id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isAnnouncement
                    ? 'bg-yellow-100 border border-yellow-200'
                    : message.sender._id === user.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              >
                {message.isAnnouncement && (
                  <div className="flex items-center text-yellow-700 text-xs font-semibold mb-1">
                    <Megaphone className="w-3 h-3 mr-1" />
                    ANNOUNCEMENT
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    message.isAnnouncement ? 'text-yellow-800' : 'text-gray-800'
                  }`}>
                    {message.sender.name}
                    {message.sender._id === user.id && ' (You)'}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                
                <p className={`text-sm ${
                  message.isAnnouncement ? 'text-yellow-700' : 'text-gray-700'
                }`}>
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isAnnouncement && user.role === 'teacher' 
                ? "Type your announcement..." 
                : "Type a message..."
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;