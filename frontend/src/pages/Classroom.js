import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload, FileText, Users, MessageSquare, Download, BookOpen, Trash2 } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import FileSearch from '../components/FileSearch';

const Classroom = () => {
  const [classData, setClassData] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    description: '',
    category: 'general'
  });

  const { id } = useParams();
  const { user } = useAuth();

  useEffect(() => {
    fetchClassData();
    fetchFiles();
  }, [id]);

  const fetchClassData = async () => {
    try {
      const response = await api.get(`classes/${id}`);
      setClassData(response.data.data.class);
    } catch (error) {
      console.error('Error fetching class data:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await api.get(`files/class/${id}`);
      setFiles(response.data.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`files/${fileId}`);
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch (error) {
      alert('Error deleting file: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login again to download files');
        return;
      }

      // Create download URL with authorization
      // Use the configured axios base URL for the download link
      const downloadUrl = `${api.defaults.baseURL.replace(/\/$/, '')}/files/download/${fileId}`;
      
      // Fetch the file with authorization header
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Convert response to blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file: ' + (error.message || 'Download failed'));
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('classId', id);
    formData.append('description', uploadData.description);
    formData.append('category', uploadData.category);

    try {
      const response = await api.post('files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFiles(prev => [response.data.data.file, ...prev]);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadData({ description: '', category: 'general' });
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Class not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Class Header */}
      <div className="mb-8">
        <div 
          className="h-4 rounded-t-lg mb-4"
          style={{ backgroundColor: classData.color }}
        ></div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {classData.name}
            </h1>
            <p className="text-gray-600 mb-4">
              {classData.description || 'No description provided.'}
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />

                 <span>
                    {classData.teachers?.map(t => t.name).join(', ')} • 
                    {classData.students?.length || 0} students
                  </span>


              </div>
              <span>Code: {classData.code}</span>
            </div>
          </div>
          
          {user?.role === 'teacher' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </button>
          )}
        </div>
      </div>

      {/* Announcements Panel - ADDED */}
      <div className="mb-8">
        <AnnouncementsPanel classId={id} classData={classData} />
      </div>

       
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Search Files</h2>
                <FileSearch 
                classId={id}
                 onFileSelect={(file) => {
              // You can add file preview or download functionality here
                console.log('Selected file:', file);
                 alert(`Selected: ${file.originalName}`);
              }}
             />
        </div>

      {/* Files Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Class Files</h2>
        
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No files uploaded yet</p>
            {user?.role === 'teacher' && (
              <p className="text-sm">Upload the first file to get started</p>
            )}
          </div>
        ) : (
          <div
            className="space-y-3"
            style={{
              maxHeight: '420px',
              overflowY: 'auto',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#c7d2fe #f1f5f9'
            }}
          >
            {files.map(file => (
              <div key={file._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {file.originalName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Uploaded by {file.uploadedBy?.name} • 
                      {new Date(file.createdAt).toLocaleDateString()} • 
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs capitalize">
                    {file.category}
                  </span>
                  <button
                    onClick={() => handleDownload(file._id, file.originalName)}
                    className="p-2 bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <button
                      onClick={() => handleDeleteFile(file._id, file.originalName)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg font-medium transition-colors duration-200 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="mb-8">
        <ChatPanel classId={id} classData={classData} />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Upload File</h2>
            <form onSubmit={handleFileUpload}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="File description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="timetable">Timetable</option>
                    <option value="notice">Notice</option>
                    <option value="study-material">Study Material</option>
                    <option value="exam">Exam</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={!uploadFile}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
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

export default Classroom;