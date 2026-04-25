const express = require('express');
const Message = require('../models/Message');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get messages for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this class
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user has access to this class (is teacher OR student)
    const hasAccess = 
      classData.teachers.some(teacher => teacher.toString() === req.user._id.toString()) ||
      classData.students.some(student => student.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({ class: classId })
      .populate('sender', 'name email avatar role')
      .populate('file')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read by current user
    const unreadMessages = messages.filter(msg => 
      !msg.readBy.includes(req.user._id)
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: unreadMessages.map(msg => msg._id) },
          class: classId
        },
        { $addToSet: { readBy: req.user._id } }
      );
    }

    // Reverse to show oldest first in UI
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      data: {
        messages: reversedMessages,
        currentPage: page,
        totalPages: Math.ceil(messages.length / limit)
      }
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

// Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { classId, content, messageType = 'text', fileId, isAnnouncement = false } = req.body;

    // Check if user has access to this class
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user has access to this class (is teacher OR student)
    const hasAccess = 
      classData.teachers.some(teacher => teacher.toString() === req.user._id.toString()) ||
      classData.students.some(student => student.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Only teachers can send announcements
    if (isAnnouncement) {
      const isTeacher = classData.teachers.some(teacher => 
        teacher.toString() === req.user._id.toString()
      );
      
      if (!isTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Only teachers can send announcements'
        });
      }
    }

    const newMessage = new Message({
      class: classId,
      sender: req.user._id,
      content,
      messageType,
      file: fileId,
      isAnnouncement,
      readBy: [req.user._id] // Sender has read the message
    });

    await newMessage.save();
    
    // Populate sender info for real-time emission
    await newMessage.populate('sender', 'name email avatar role');
    if (fileId) {
      await newMessage.populate('file');
    }

    // Emit real-time message to all class members
    const io = req.app.get('io');
    io.to(classId).emit('new-message', {
      message: newMessage,
      classId: classId
    });

    // Special event for announcements
    if (isAnnouncement) {
      io.to(classId).emit('new-announcement', {
        message: newMessage,
        classId: classId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// Mark message as read
router.post('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message's class
    const classData = await Class.findById(message.class);
    const hasAccess = 
      classData.teachers.some(teacher => teacher.toString() === req.user._id.toString()) ||
      classData.students.some(student => student.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this message'
      });
    }

    // Mark as read if not already
    if (!message.readBy.includes(req.user._id)) {
      message.readBy.push(req.user._id);
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message
    });
  }
});

// Get unread message count for a class
router.get('/class/:classId/unread-count', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    const unreadCount = await Message.countDocuments({
      class: classId,
      readBy: { $ne: req.user._id },
      sender: { $ne: req.user._id } // Don't count own messages
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
});

// Delete message (teachers can delete their own messages)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Allow: sender themselves, admins, or teachers of this class
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    let isTeacherOfClass = false;
    if (!isSender && !isAdmin) {
      const classData = await Class.findById(message.class);
      if (classData) {
        isTeacherOfClass = classData.teachers.some(
          t => t.toString() === req.user._id.toString()
        );
      }
    }

    if (!isSender && !isAdmin && !isTeacherOfClass) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can delete messages'
      });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    // Emit real-time deletion event
    const io = req.app.get('io');
    io.to(message.class.toString()).emit('message-deleted', {
      messageId: message._id,
      classId: message.class
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

module.exports = router;