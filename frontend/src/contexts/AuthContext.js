import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Configure API base URL
let apiBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Auto-fix: Ensure it ends with /api if it's a remote URL and /api is missing
if (apiBaseURL.startsWith('http') && !apiBaseURL.endsWith('/api') && !apiBaseURL.endsWith('/api/')) {
  apiBaseURL = apiBaseURL.replace(/\/$/, '') + '/api';
}

axios.defaults.baseURL = apiBaseURL;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // ✅ Define updateUser function FIRST
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Set axios default headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
  const checkAuth = async () => {
    if (token) {
      try {
        const response = await axios.get('/auth/me');
        const userData = response.data.data.user;
        
        // Check if user is still active
        if (userData.isActive === false) {
          // If deactivated, logout
          logout();
          window.location.href = '/login?reason=deactivated';
          return;
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  checkAuth();
}, [token]);

 const login = async (email, password) => {
  try {
    const response = await axios.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    const message = error.response?.data?.message || 'Login failed';
    
    // Special handling for deactivated accounts
    if (message.includes('deactivated')) {
      return { 
        success: false, 
        message: 'Your account has been deactivated. Please contact an administrator.' 
      };
    }
    
    return { 
      success: false, 
      message: message
    };
  }
};
  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // ✅ Now updateUser is defined before being used in value object
  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};