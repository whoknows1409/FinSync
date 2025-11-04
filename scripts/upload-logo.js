const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get the logo filename from command line arguments
const logoFileName = process.argv[2];

// Check if filename was provided
if (!logoFileName) {
  console.error('Error: Please provide a logo filename as an argument');
  console.log('Usage: npm run upload-logo -- your-logo.png');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the Settings model (same as in your backend)
const SettingsSchema = new mongoose.Schema({
  logo: {
    data: Buffer,
    contentType: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', SettingsSchema);

async function uploadLogo() {
  try {
    // Path to your logo file
    const logoPath = path.join(__dirname, logoFileName);
    
    // Check if the file exists
    if (!fs.existsSync(logoPath)) {
      console.error(`Error: Logo file not found at ${logoPath}`);
      console.log(`Please make sure ${logoFileName} is in the scripts folder.`);
      process.exit(1);
    }
    
    // Read the file
    const logoData = fs.readFileSync(logoPath);
    
    // Determine content type based on file extension
    const ext = path.extname(logoFileName).toLowerCase();
    let contentType = 'image/png'; // default
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    // Find existing settings or create a new one
    let settings = await Settings.findOne({});
    
    if (!settings) {
      settings = new Settings();
    }
    
    // Update the logo
    settings.logo = {
      data: logoData,
      contentType: contentType
    };
    
    await settings.save();
    
    console.log(`Logo ${logoFileName} uploaded successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('Error uploading logo:', error);
    process.exit(1);
  }
}

uploadLogo();