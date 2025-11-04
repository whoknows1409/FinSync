#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Finsync Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env file from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please update it with your configuration.\n');
  } else {
    console.log('❌ env.example file not found. Please create .env file manually.\n');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Create necessary directories
const directories = [
  'uploads',
  'uploads/profiles',
  'temp',
  'logs',
  'docs',
  'docs/postman'
];

console.log('📁 Creating necessary directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`✅ Directory already exists: ${dir}`);
  }
});

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Dependencies installed successfully.\n');
} catch (error) {
  console.log('❌ Failed to install dependencies. Please run "npm install" manually.\n');
}

// Check MongoDB connection
console.log('🔍 Checking MongoDB connection...');
try {
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  
  // Load environment variables
  dotenv.config({ path: envPath });
  
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set in .env file. Please configure it.\n');
  } else {
    console.log('✅ MongoDB URI configured.\n');
  }
} catch (error) {
  console.log('⚠️  Could not check MongoDB configuration. Make sure MongoDB is installed and running.\n');
}

// Check Gemini API key
console.log('🤖 Checking Gemini API configuration...');
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: envPath });
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not set in .env file. Please get your API key from Google AI Studio.\n');
  } else {
    console.log('✅ Gemini API key configured.\n');
  }
} catch (error) {
  console.log('⚠️  Could not check Gemini API configuration.\n');
}

console.log('🎉 Setup completed!\n');
console.log('📋 Next steps:');
console.log('1. Update .env file with your configuration');
console.log('2. Start MongoDB service');
console.log('3. Run "npm run seed" to populate sample data');
console.log('4. Run "npm run dev" to start the development server');
console.log('5. Import Postman collection from docs/postman/ for API testing\n');

console.log('🔗 Useful links:');
console.log('- Google AI Studio: https://makersuite.google.com/app/apikey');
console.log('- MongoDB: https://www.mongodb.com/try/download/community');
console.log('- API Documentation: README.md\n');

console.log('Happy coding! 🚀');
