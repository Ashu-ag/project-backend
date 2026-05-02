const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const adminData = {
      name: 'System Admin',
      email: 'admin@classroom.com',
      password: 'AdminPassword123!', // You should change this immediately
      role: 'admin',
      isActive: true
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists. Updating role to admin...');
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Admin role confirmed for:', adminData.email);
    } else {
      const admin = new User(adminData);
      await admin.save();
      console.log('🚀 Admin account created successfully!');
      console.log('📧 Email:', adminData.email);
      console.log('🔑 Password:', adminData.password);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
