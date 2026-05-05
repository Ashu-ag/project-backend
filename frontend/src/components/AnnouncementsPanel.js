import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../contexts/AuthContext';
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
      const response = await api.get(`messages/class/${classId}`);
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
      await api.post('messages/send', {
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
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    try {
      await api.delete(`messages/${announcementId}`);
      // Optimistic update — remove from local state immediately
      setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Error deleting: ' + (error.response?.data?.message || error.message));
    }
  };

  // Can delete if: admin, or teacher (any announcement in this class)
  const canDelete = user.role === 'admin' || user.role === 'teacher';

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
      <div className="border-b border-gray-200 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
            <Megaphone className="w-5 h-5 mr-2 text-blue-600" />
            Class Announcements
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {announcements.length}
            </span>
          </h3>
          {(user.role === 'teacher' || user.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-amber-500 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 flex items-center justify-center text-sm md:text-base"
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
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full mt-1 flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-yellow-800 text-sm md:text-base truncate">
                        {announcement.sender.name}
                      </h4>
                      {announcement.sender._id === user.id && (
                        <span className="bg-yellow-200 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-yellow-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(announcement.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-yellow-200 pt-2 md:pt-0">
                  <div className="flex items-center text-xs text-yellow-600">
                    <Eye className="w-3 h-3 mr-1" />
                    {announcement.readBy?.length || 0} read
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-yellow-700 ml-0 md:ml-11 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
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