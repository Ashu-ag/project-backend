import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Megaphone, Users, GraduationCap } from 'lucide-react';
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
    
    // Initialize Socket.io - Derive backend URL from axios baseURL
    const backendUrl = axios.defaults.baseURL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const newSocket = io(backendUrl);
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
      const response = await axios.get(`messages/class/${classId}`);
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
      const response = await axios.post('messages/send', {
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center" style={{ height: '600px' }}>
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
      <div
        className="overflow-y-auto p-4 space-y-3"
        style={{
          height: '520px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#c7d2fe #f1f5f9'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender._id === user.id;
            const isTeacher = message.sender.role === 'teacher';
            const isAnnouncement = message.isAnnouncement;

            // Bubble color logic
            let bubbleBg, bubbleBorder, nameColor, textColor;
            if (isAnnouncement) {
              bubbleBg = '#fef9c3'; bubbleBorder = '#fde68a';
              nameColor = '#92400e'; textColor = '#b45309';
            } else if (isOwn) {
              bubbleBg = '#dbeafe'; bubbleBorder = '#bfdbfe';
              nameColor = '#1e40af'; textColor = '#1d4ed8';
            } else if (isTeacher) {
              bubbleBg = '#f3e8ff'; bubbleBorder = '#d8b4fe';
              nameColor = '#6b21a8'; textColor = '#7e22ce';
            } else {
              bubbleBg = '#f3f4f6'; bubbleBorder = '#e5e7eb';
              nameColor = '#374151'; textColor = '#4b5563';
            }

            return (
              <div
                key={message._id}
                className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar — only for others */}
                {!isOwn && (
                  <div
                    title={isTeacher ? 'Teacher' : 'Student'}
                    style={{
                      flexShrink: 0,
                      width: '34px', height: '34px',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700',
                      background: isTeacher
                        ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                        : 'linear-gradient(135deg,#6b7280,#9ca3af)',
                      color: '#fff',
                      boxShadow: isTeacher ? '0 2px 8px rgba(124,58,237,0.4)' : 'none',
                      border: isTeacher ? '2px solid #d8b4fe' : '2px solid #e5e7eb'
                    }}
                  >
                    {isTeacher
                      ? <GraduationCap size={16} />
                      : message.sender.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: '340px',
                    padding: '10px 14px',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: bubbleBg,
                    border: `1px solid ${bubbleBorder}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
                  }}
                >
                  {/* Announcement banner */}
                  {isAnnouncement && (
                    <div style={{ display:'flex', alignItems:'center', color:'#92400e', fontSize:'11px', fontWeight:'700', marginBottom:'6px', gap:'4px' }}>
                      <Megaphone size={11} />
                      ANNOUNCEMENT
                    </div>
                  )}

                  {/* Name row */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'13px', fontWeight:'700', color: nameColor }}>
                        {message.sender.name}{isOwn && ' (You)'}
                      </span>
                      {/* Teacher badge */}
                      {isTeacher && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          fontSize: '10px', fontWeight: '700',
                          padding: '1px 7px', borderRadius: '999px',
                          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                          color: '#fff',
                          letterSpacing: '0.04em',
                          boxShadow: '0 1px 4px rgba(124,58,237,0.35)'
                        }}>
                          <GraduationCap size={9} />
                          TEACHER
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize:'11px', color:'#9ca3af', whiteSpace:'nowrap' }}>
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  {/* Message text */}
                  <p style={{ fontSize:'14px', color: textColor, margin: 0, lineHeight: '1.5' }}>
                    {message.content}
                  </p>
                </div>

                {/* Own avatar */}
                {isOwn && (
                  <div style={{
                    flexShrink: 0,
                    width: '34px', height: '34px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700',
                    background: user.role === 'teacher'
                      ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                      : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                    color: '#fff',
                    border: user.role === 'teacher' ? '2px solid #d8b4fe' : '2px solid #bfdbfe'
                  }}>
                    {user.role === 'teacher'
                      ? <GraduationCap size={16} />
                      : user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
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