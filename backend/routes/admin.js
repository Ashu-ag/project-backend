const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const File = require('../models/File');
const Message = require('../models/Message');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// All routes require admin authentication
router.use(auth, requireRole('admin'));

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('classes')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, bio, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const newUser = new User({
      name,
      email,
      password,
      role: role || 'student',
      bio: bio || '',
      phone: phone || ''
    });

    await newUser.save();

    const userResponse = await User.findById(newUser._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

// Update user
router.put('/users/:userId', async (req, res) => {
  try {
    const { name, email, role, bio, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { name, email, role, bio, phone },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove user from all classes
    await Class.updateMany(
      { teachers: req.params.userId },
      { $pull: { teachers: req.params.userId } }
    );
    
    await Class.updateMany(
      { students: req.params.userId },
      { $pull: { students: req.params.userId } }
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Toggle user status
router.patch('/users/:userId/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user status',
      error: error.message
    });
  }
});

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teachers', 'name email')
      .populate('students', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { classes }
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
});

// Delete class
router.delete('/classes/:classId', async (req, res) => {
  try {
    const classToDelete = await Class.findByIdAndDelete(req.params.classId);

    if (!classToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Remove class from all users
    await User.updateMany(
      { classes: req.params.classId },
      { $pull: { classes: req.params.classId } }
    );

    // Delete all files in this class
    await File.deleteMany({ class: req.params.classId });

    // Delete all messages in this class
    await Message.deleteMany({ class: req.params.classId });

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message
    });
  }
});

// Get all files
router.get('/files', async (req, res) => {
  try {
    const files = await File.find()
      .populate('uploadedBy', 'name email')
      .populate('class', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { files }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
});

// Get all messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'name email')
      .populate('class', 'name')
      .populate('file')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

module.exports = router;