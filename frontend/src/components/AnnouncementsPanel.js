import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Megaphone, Calendar, Eye, Users, Plus, Trash2 } from 'lucide-react';

const AnnouncementsPanel = ({ classId, classData }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`/messages/class/${classId}`);
      // Filter only announcements and sort by latest first
      const announcementMessages = response.data.data.messages
        .filter(msg => msg.isAnnouncement)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAnnouncements(announcementMessages);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;

    try {
      await axios.post('/messages/send', {
        classId,
        content: newAnnouncement,
        isAnnouncement: true
      });

      setNewAnnouncement('');
      setShowCreateModal(false);
      fetchAnnouncements(); // Refresh the list
      alert('Announcement posted successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error creating announcement: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      // Note: You'll need to add a delete route in your backend
      await axios.delete(`/messages/${announcementId}`);
      fetchAnnouncements(); // Refresh the list
      alert('Announcement deleted successfully!');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Error deleting announcement: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Megaphone className="w-5 h-5 mr-2" />
            Class Announcements
            <span className="ml-2 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {announcements.length}
            </span>
          </h3>
          {user.role === 'teacher' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {announcements.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-2">No announcements yet</p>
            <p className="text-sm">
              {user.role === 'teacher' 
                ? 'Create the first announcement to share important updates with your class'
                : 'Your teacher will post announcements here'
              }
            </p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement._id}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full mt-1">
                    <Megaphone className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-yellow-800">
                        {announcement.sender.name}
                      </h4>
                      {announcement.sender._id === user.id && (
                        <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-yellow-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(announcement.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-sm text-yellow-600">
                    <Eye className="w-3 h-3 mr-1" />
                    {announcement.readBy?.length || 0} read
                  </div>
                  
                  {user.role === 'teacher' && announcement.sender._id === user.id && (
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement._id)}
                      className="p-1 text-yellow-600 hover:text-red-600 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-yellow-700 ml-11 whitespace-pre-wrap">
                {announcement.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Megaphone className="w-5 h-5 mr-2" />
              New Announcement
            </h2>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Announcement Message
                </label>
                <textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="4"
                  placeholder="Share important updates with the class..."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This announcement will be visible to all students in the class.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Post Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPanel;