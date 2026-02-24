const express = require('express');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Generate unique class code
const generateClassCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existingClass = await Class.findOne({ code });
    if (!existingClass) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    code = code + Date.now().toString().slice(-4);
  }

  return code;
};

// Create a new class (Teacher only)
router.post('/', auth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { name, description, subject, color } = req.body;

    console.log('Creating class for user:', req.user._id);

    // Generate unique class code
    const code = await generateClassCode();

    // Create the class with creator as first teacher
    const newClass = new Class({
      name,
      description: description || '',
      subject: subject || '',
      color: color || '#3B82F6',
      code: code,
      teachers: [req.user._id], // Array of teachers
      students: []
    });

    await newClass.save();

    // Add class to teacher's classes array
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { classes: newClass._id } }
    );

    // Populate the response
    const populatedClass = await Class.findById(newClass._id)
      .populate('teachers', 'name email')
      .populate('students', 'name email');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: { 
        class: populatedClass
      }
    });

  } catch (error) {
    console.error('Error creating class:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Class code already exists. Please try again.',
        error: 'Duplicate class code'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating class: ' + error.message,
      error: error.message
    });
  }
});

// Get all classes for current user - UPDATED FOR MULTIPLE TEACHERS
router.get('/my-classes', auth, async (req, res) => {
  try {
    let classes;
    
    if (req.user.role === 'teacher') {
      // Teachers see classes where they are either a teacher OR a student
      classes = await Class.find({
        $or: [
          { teachers: req.user._id },  // Classes they teach
          { students: req.user._id }   // Classes they've joined as co-teacher
        ]
      })
      .populate('teachers', 'name email')
      .populate('students', 'name email')
      .sort({ createdAt: -1 });
    } else {
      // Students only see classes they've joined as students
      classes = await Class.find({ students: req.user._id })
        .populate('teachers', 'name email')
        .populate('students', 'name email')
        .sort({ createdAt: -1 });
    }

    console.log(`Found ${classes.length} classes for user ${req.user._id}`);

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

// Join class with code - UPDATED FOR TEACHER/STUDENT HANDLING
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;

    console.log('Join request:', { code, userId: req.user._id, role: req.user.role });

    // Find class by code
    const classToJoin = await Class.findOne({ code: code.toUpperCase() })
      .populate('teachers', 'name email')
      .populate('students', 'name email');

    if (!classToJoin) {
      return res.status(404).json({
        success: false,
        message: 'Class not found with this code'
      });
    }

    // Check if user is already in the class (as teacher or student)
    const isAlreadyTeacher = classToJoin.teachers.some(teacher => 
      teacher._id.toString() === req.user._id.toString()
    );
    
    const isAlreadyStudent = classToJoin.students.some(student => 
      student._id.toString() === req.user._id.toString()
    );

    if (isAlreadyTeacher || isAlreadyStudent) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this class'
      });
    }

    // Handle joining based on user role
    if (req.user.role === 'teacher') {
      // Teachers join as co-teachers
      classToJoin.teachers.push(req.user._id);
    } else {
      // Students join as students
      classToJoin.students.push(req.user._id);
    }

    await classToJoin.save();

    // Add class to user's classes array
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { classes: classToJoin._id } }
    );

    // Refresh the class data
    const updatedClass = await Class.findById(classToJoin._id)
      .populate('teachers', 'name email')
      .populate('students', 'name email');

    // Emit real-time event
    const io = req.app.get('io');
    io.to(classToJoin._id.toString()).emit('user-joined', {
      user: req.user,
      class: classToJoin.name,
      role: req.user.role
    });

    const joinType = req.user.role === 'teacher' ? 'co-teacher' : 'student';
    console.log(`User joined as ${joinType}. Updated class:`, {
      teachers: updatedClass.teachers.length,
      students: updatedClass.students.length
    });

    res.json({
      success: true,
      message: `Successfully joined class as ${joinType}`,
      data: { class: updatedClass }
    });
  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining class: ' + error.message,
      error: error.message
    });
  }
});

// Get class by ID - UPDATED FOR MULTIPLE TEACHERS
router.get('/:id', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('teachers', 'name email avatar')
      .populate('students', 'name email avatar');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user has access to this class (is teacher OR student)
    const hasAccess = 
      classData.teachers.some(teacher => teacher._id.toString() === req.user._id.toString()) ||
      classData.students.some(student => student._id.toString() === req.user._id.toString());

    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    res.json({
      success: true,
      data: { class: classData }
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class',
      error: error.message
    });
  }
});

// Leave class
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Remove user from teachers or students array
    if (req.user.role === 'teacher') {
      classData.teachers = classData.teachers.filter(
        teacherId => teacherId.toString() !== req.user._id.toString()
      );
    } else {
      classData.students = classData.students.filter(
        studentId => studentId.toString() !== req.user._id.toString()
      );
    }

    await classData.save();

    // Remove class from user's classes array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { classes: classData._id } }
    );

    res.json({
      success: true,
      message: 'Successfully left the class'
    });
  } catch (error) {
    console.error('Error leaving class:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving class',
      error: error.message
    });
  }
});

module.exports = router;