import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Users, 
  BookOpen, 
  FileText, 
  MessageSquare,
  TrendingUp,
  UserPlus,
  UserMinus,
  Edit3,
  Trash2,
  Shield,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  GraduationCap
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalFiles: 0,
    totalMessages: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    password: '',
    bio: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, classesRes, filesRes, messagesRes] = await Promise.all([
        axios.get('admin/users'),
        axios.get('admin/classes'),
        axios.get('admin/files'),
        axios.get('admin/messages')
      ]);

      setUsers(usersRes.data.data.users);
      setClasses(classesRes.data.data.classes);
      setFiles(filesRes.data.data.files);
      setMessages(messagesRes.data.data.messages);

      // Calculate stats
      setStats({
        totalUsers: usersRes.data.data.users.length,
        totalTeachers: usersRes.data.data.users.filter(u => u.role === 'teacher').length,
        totalStudents: usersRes.data.data.users.filter(u => u.role === 'student').length,
        totalClasses: classesRes.data.data.classes.length,
        totalFiles: filesRes.data.data.files.length,
        totalMessages: messagesRes.data.data.messages.length
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('admin/users', formData);
      setUsers(prev => [response.data.data.user, ...prev]);
      setShowUserModal(false);
      setFormData({ name: '', email: '', role: 'student', password: '', bio: '' });
      alert('User created successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateUser = async (userId) => {
    try {
      const response = await axios.put(`admin/users/${userId}`, formData);
      setUsers(prev => prev.map(u => u._id === userId ? response.data.data.user : u));
      setShowUserModal(false);
      setEditMode(false);
      alert('User updated successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      alert('User deleted successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error.response?.data?.message || error.message));
    }
  };
  
    const handleToggleUserStatus = async (userId, currentStatus) => {
  try {
    console.log('🔄 Toggling status for user:', userId, 'Current status:', currentStatus);
    
    const response = await axios.patch(`admin/users/${userId}/toggle-status`);
    console.log('✅ Toggle response:', response.data);
    
    // Update the users list with the updated user
    setUsers(prev => prev.map(u => 
      u._id === userId ? response.data.data.user : u
    ));
    
    // Update stats
    const updatedUser = response.data.data.user;
    setStats(prev => ({
      ...prev,
      totalUsers: updatedUser.isActive ? prev.totalUsers + 1 : prev.totalUsers - 1,
      totalTeachers: updatedUser.role === 'teacher' 
        ? (updatedUser.isActive ? prev.totalTeachers + 1 : prev.totalTeachers - 1)
        : prev.totalTeachers,
      totalStudents: updatedUser.role === 'student'
        ? (updatedUser.isActive ? prev.totalStudents + 1 : prev.totalStudents - 1)
        : prev.totalStudents
    }));
    
    alert(`User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully!`);
  } catch (error) {
    console.error('❌ Error toggling user status:', error);
    console.error('Error response:', error.response?.data);
    alert('Error toggling user status: ' + (error.response?.data?.message || error.message));
  }
};


  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`admin/classes/${classId}`);
      setClasses(prev => prev.filter(c => c._id !== classId));
      alert('Class deleted successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Error deleting class: ' + (error.response?.data?.message || error.message));
    }
  };

  const openUserModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: '',
        bio: user.bio || ''
      });
      setEditMode(true);
    } else {
      setSelectedUser(null);
      setFormData({ name: '', email: '', role: 'student', password: '', bio: '' });
      setEditMode(false);
    }
    setShowUserModal(true);
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage users, classes, and system settings</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-600" />
          <StatCard title="Teachers" value={stats.totalTeachers} icon={UserPlus} color="bg-green-600" />
          <StatCard title="Students" value={stats.totalStudents} icon={UserMinus} color="bg-purple-600" />
          <StatCard title="Classes" value={stats.totalClasses} icon={BookOpen} color="bg-yellow-600" />
          <StatCard title="Files" value={stats.totalFiles} icon={FileText} color="bg-red-600" />
          <StatCard title="Messages" value={stats.totalMessages} icon={MessageSquare} color="bg-indigo-600" />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'classes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Classes
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              System
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Users */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Users
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.slice(0, 5).map(user => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'teacher' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Classes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Classes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.slice(0, 3).map(cls => (
                    <div key={cls._id} className="border border-gray-200 rounded-lg p-4">
                      <div 
                        className="h-2 rounded mb-3"
                        style={{ backgroundColor: cls.color }}
                      ></div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Code: {cls.code}</p>
                      <p className="text-sm text-gray-500">
                        {cls.teachers?.length || 0} teachers • {cls.students?.length || 0} students
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (() => {
            const q = userSearch.toLowerCase();
            const teachers = users.filter(u => u.role === 'teacher' &&
              (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
            const students = users.filter(u => u.role === 'student' &&
              (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));

            const UserTable = ({ list, accentColor, emptyLabel }) => (
              <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #f9fafb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                    <tr>
                      {['Name', 'Email', 'Status', 'Classes', 'Last Login', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '13px' }}>{emptyLabel}</td></tr>
                    ) : list.map((u, i) => (
                      <tr key={u._id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                        {/* Name + avatar */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {u.avatar ? (
                              <img src={`${axios.defaults.baseURL.replace(/\/api\/?$/, '')}${u.avatar}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: accentColor === 'purple'
                                  ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                                  : 'linear-gradient(135deg,#2563eb,#6366f1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: '700', fontSize: '13px'
                              }}>
                                {u.name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontWeight: '600', color: '#111827' }}>{u.name}</span>
                          </div>
                        </td>
                        {/* Email */}
                        <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{u.email}</td>
                        {/* Status toggle */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                            style={{
                              padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600',
                              border: 'none', cursor: 'pointer',
                              background: u.isActive ? '#dcfce7' : '#fee2e2',
                              color: u.isActive ? '#166534' : '#991b1b'
                            }}
                          >
                            {u.isActive ? '● Active' : '● Inactive'}
                          </button>
                        </td>
                        {/* Classes */}
                        <td style={{ padding: '12px 14px', color: '#6b7280', textAlign: 'center' }}>{u.classes?.length || 0}</td>
                        {/* Last Login */}
                        <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => openUserModal(u)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px' }}
                              title="Edit">
                              <Edit3 size={15} />
                            </button>
                            <button onClick={() => handleDeleteUser(u._id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}
                              title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top bar: title + search + add user */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#2563eb" />
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Manage Users</h2>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px' }}>
                      {users.length} total
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                        fontSize: '13px', outline: 'none', minWidth: '200px'
                      }}
                    />
                    <button
                      onClick={() => { setFormData(p => ({ ...p, role: 'teacher' })); openUserModal(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                        color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.3)'
                      }}
                    >
                      <UserPlus size={15} /> Add Teacher
                    </button>
                    <button
                      onClick={() => { setFormData(p => ({ ...p, role: 'student' })); openUserModal(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg,#2563eb,#6366f1)',
                        color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                      }}
                    >
                      <UserPlus size={15} /> Add Student
                    </button>
                  </div>
                </div>

                {/* ───── Teachers Section ───── */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GraduationCap size={20} color="#fff" />
                      <h3 style={{ margin: 0, color: '#fff', fontWeight: '700', fontSize: '15px' }}>Teachers</h3>
                      <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px' }}>
                        {teachers.length}
                      </span>
                    </div>
                    <button
                      onClick={() => { setFormData(p => ({ ...p, role: 'teacher' })); openUserModal(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '7px', padding: '5px 12px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <UserPlus size={13} /> Add Teacher
                    </button>
                  </div>
                  <UserTable list={teachers} accentColor="purple" emptyLabel={userSearch ? 'No teachers match your search.' : 'No teachers yet.'} />
                </div>

                {/* ───── Students Section ───── */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={20} color="#fff" />
                      <h3 style={{ margin: 0, color: '#fff', fontWeight: '700', fontSize: '15px' }}>Students</h3>
                      <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px' }}>
                        {students.length}
                      </span>
                    </div>
                    <button
                      onClick={() => { setFormData(p => ({ ...p, role: 'student' })); openUserModal(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '7px', padding: '5px 12px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <UserPlus size={13} /> Add Student
                    </button>
                  </div>
                  <UserTable list={students} accentColor="blue" emptyLabel={userSearch ? 'No students match your search.' : 'No students yet.'} />
                </div>
              </div>
            );
          })()}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Manage Classes
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teachers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {classes.map(cls => (
                      <tr key={cls._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: cls.color }}
                            ></div>
                            <span className="text-sm font-medium text-gray-900">{cls.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cls.teachers?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cls.students?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {files.filter(f => f.class === cls._id).length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(cls.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteClass(cls._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* System Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  System Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Database Size</span>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">~12.5 MB</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Storage Used</span>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">~45.2 MB</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">API Status</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">Operational</p>
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {messages.slice(0, 5).map(msg => (
                    <div key={msg._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{msg.sender?.name}</span> sent a message in{' '}
                          <span className="font-medium">
                            {classes.find(c => c._id === msg.class)?.name || 'a class'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
              {editMode ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              editMode ? handleUpdateUser(selectedUser._id) : handleCreateUser(e);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {!editMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!editMode}
                      minLength="6"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional user bio..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {editMode ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditMode(false);
                  }}
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

export default AdminDashboard;