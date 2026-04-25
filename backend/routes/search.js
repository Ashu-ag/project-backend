const express = require('express');
const http = require('http');
const File = require('../models/File');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const router = express.Router();

const fetchAIResults = (query) => {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error("AI Service Error:", err);
      resolve([]); // Fallback to empty if AI fails
    });
  });
};

// Smart search across files
router.get('/files', auth, async (req, res) => {
  try {
    const { q, classId, category, fileType, dateFrom, dateTo, tags } = req.query;
    
    let searchQuery = { isDeleted: false };
    
    // Filter by class if specified
    if (classId) {
      // Verify user has access to this class
      const classData = await Class.findById(classId);
      const hasAccess = 
        classData.teachers.some(teacher => teacher.toString() === req.user._id.toString()) ||
        classData.students.some(student => student.toString() === req.user._id.toString());
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this class'
        });
      }
      searchQuery.class = classId;
    } else {
      // Get all classes user has access to
      const userClasses = await Class.find({
        $or: [
          { teachers: req.user._id },
          { students: req.user._id }
        ]
      }).select('_id');
      
      searchQuery.class = { $in: userClasses.map(c => c._id) };
    }

    // Text search using AI Microservice
    let aiResults = [];
    let aiScoreMap = {};
    if (q) {
      try {
        aiResults = await fetchAIResults(q);
        if (aiResults && aiResults.length > 0) {
          const aiFileIds = aiResults.map(r => r.file_id);
          searchQuery._id = { $in: aiFileIds };
          
          aiResults.forEach(r => {
             aiScoreMap[r.file_id] = {
               score: r.score,
               excerpt: r.excerpt,
               matched_terms: r.matched_terms,
               extracted_method: r.extracted_method
             };
          });
        } else {
          // Fallback to mongo text search if AI returns empty
          searchQuery.$text = { $search: q };
        }
      } catch (e) {
        searchQuery.$text = { $search: q };
      }
    }

    // Category filter
    if (category) {
      searchQuery.category = category;
    }

    // File type filter
    if (fileType) {
      searchQuery.fileType = fileType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      searchQuery.aiTags = { $in: tagArray };
    }

    let files = await File.find(searchQuery)
      .populate('uploadedBy', 'name email avatar')
      .populate('class', 'name code color')
      .sort({ createdAt: -1 });

    // Attach AI properties if available and sort by AI score
    if (q && Object.keys(aiScoreMap).length > 0) {
      files = files.map(file => {
        const fileObj = file.toObject();
        const aiData = aiScoreMap[file._id.toString()];
        if (aiData) {
          fileObj.aiScore = aiData.score;
          fileObj.aiExcerpt = aiData.excerpt;
          fileObj.aiMatchedTerms = aiData.matched_terms;
          fileObj.aiExtractedMethod = aiData.extracted_method;
        }
        return fileObj;
      });
      // Sort by AI score descending
      files.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    }

    res.json({
      success: true,
      data: {
        files,
        totalCount: files.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching files',
      error: error.message
    });
  }
});

// Get search suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Get user's accessible classes
    const userClasses = await Class.find({
      $or: [
        { teachers: req.user._id },
        { students: req.user._id }
      ]
    }).select('_id');

    const suggestions = await File.find({
      class: { $in: userClasses.map(c => c._id) },
      $or: [
        { originalName: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { aiTags: new RegExp(q, 'i') }
      ],
      isDeleted: false
    })
    .select('originalName description aiTags category')
    .limit(10)
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting suggestions',
      error: error.message
    });
  }
});

// Get available filters for a class
router.get('/filters/:classId?', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    
    let query = { isDeleted: false };
    
    if (classId) {
      query.class = classId;
    } else {
      const userClasses = await Class.find({
        $or: [
          { teachers: req.user._id },
          { students: req.user._id }
        ]
      }).select('_id');
      query.class = { $in: userClasses.map(c => c._id) };
    }

    const filters = await File.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          categories: { $addToSet: '$category' },
          fileTypes: { $addToSet: '$fileType' },
          allTags: { $addToSet: '$aiTags' }
        }
      }
    ]);

    const result = filters[0] || { categories: [], fileTypes: [], allTags: [] };
    
    // Flatten tags array
    result.tags = result.allTags.flat().filter((tag, index, arr) => 
      tag && arr.indexOf(tag) === index
    ).slice(0, 20); // Limit to top 20 tags

    delete result.allTags;

    res.json({
      success: true,
      data: { filters: result }
    });
  } catch (error) {
    console.error('Filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting filters',
      error: error.message
    });
  }
});

// Update file search data
router.put('/:fileId/update-search-data', auth, async (req, res) => {
  try {
    const { fileType, aiTags, searchableText } = req.body;
    
    const updatedFile = await File.findByIdAndUpdate(
      req.params.fileId,
      {
        fileType: fileType || 'other',
        aiTags: aiTags || [],
        searchableText: searchableText || ''
      },
      { new: true }
    ).populate('uploadedBy', 'name email');

    res.json({
      success: true,
      message: 'File search data updated',
      data: { file: updatedFile }
    });
  } catch (error) {
    console.error('Error updating file search data:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating file search data',
      error: error.message
    });
  }
});

module.exports = router;