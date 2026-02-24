const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  path: { 
    type: String, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['timetable', 'notice', 'study-material', 'exam', 'image', 'general'],
    default: 'general'
  },
  tags: [{ 
    type: String 
  }],
  description: { 
    type: String, 
    default: '' 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  version: { 
    type: Number, 
    default: 1 
  },
  
  // ✅ ADD THESE NEW FIELDS FOR SEARCH (make sure they're inside the schema)
  searchableText: {
    type: String,
    default: ''
  },
  aiTags: [{
    type: String
  }],
  fileType: {
    type: String,
    enum: ['document', 'image', 'presentation', 'spreadsheet', 'pdf', 'other'],
    default: 'other'
  },
  extractedText: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// ✅ Add text index for search (AFTER the schema definition)
fileSchema.index({
  originalName: 'text',
  description: 'text',
  searchableText: 'text',
  extractedText: 'text',
  aiTags: 'text'
});

module.exports = mongoose.model('File', fileSchema);