const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const File = require('../models/File');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { classId, description, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('File upload request:', {
      classId,
      description,
      category,
      file: req.file
    });

    // Check if class exists and user has access
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

    const newFile = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      class: classId,
      uploadedBy: req.user._id,
      description: description || '',
      category: category || 'general'
    });

    await newFile.save();
    console.log('File saved to database:', newFile);

    // Notify AI Microservice to index the file
    try {
      const postData = JSON.stringify({
        file_id: newFile._id.toString(),
        filepath: path.resolve(path.join(__dirname, '../', req.file.path))
      });

      const ocrUrl = new URL(process.env.OCR_SERVICE_URL || 'http://localhost:5001');
      const options = {
        hostname: ocrUrl.hostname,
        port: ocrUrl.port,
        path: '/api/index',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const aiReq = http.request(options, (aiRes) => {
        console.log(`AI Microservice Indexing Status: ${aiRes.statusCode}`);
      });
      aiReq.on('error', (e) => {
        console.error(`AI Microservice Error: ${e.message}`);
      });
      aiReq.write(postData);
      aiReq.end();
    } catch (err) {
      console.error('Failed to notify AI microservice', err);
    }

    // Populate user data
    await newFile.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: newFile }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file: ' + error.message,
      error: error.message
    });
  }
});

// Get files for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const classId = req.params.classId;

    console.log('Fetching files for class:', classId);

    // Check if class exists and user has access
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

    const files = await File.find({ 
      class: classId,
      isDeleted: false 
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

    console.log('Found files:', files.length);

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

// Download file
router.get('/download/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has access to this file's class
    const classData = await Class.findById(file.class);
    
    // Check if user has access to this class (is teacher OR student)
    const hasAccess = 
      classData.teachers.some(teacher => teacher.toString() === req.user._id.toString()) ||
      classData.students.some(student => student.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this file'
      });
    }

    const filePath = path.join(__dirname, '../', file.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
});

// Delete file (teachers of the class + admins only)
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check class membership
    const classData = await Class.findById(file.class);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isTeacher = classData.teachers.some(
      t => t.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can delete files'
      });
    }

    // Soft-delete in DB
    file.isDeleted = true;
    await file.save();

    // Also remove physical file from disk
    const filePath = path.join(__dirname, '../', file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
});

module.exports = router;