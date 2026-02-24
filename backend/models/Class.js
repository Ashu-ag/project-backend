const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Class name is required'],
    trim: true
  },
  code: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true
  },
  description: { 
    type: String, 
    default: '' 
  },
  subject: { 
    type: String, 
    default: '' 
  },
  // Change from single teacher to multiple teachers
  teachers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }],
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  color: { 
    type: String, 
    default: '#3B82F6' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Class', classSchema);