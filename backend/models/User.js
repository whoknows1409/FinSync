const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password required only if not using Google OAuth
      return !this.googleId;
    },
    minlength: 6
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  // A new address the user asked to switch to. It replaces `email` only after
  // the link sent to it has been opened.
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  // Login tokens issued before this moment are rejected. Set when the password
  // changes or the user signs out everywhere.
  tokensValidAfter: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  profileImage: {
    type: String,
    default: ''
  },
  membershipType: {
    type: String,
    enum: ['Basic', 'Premium'],
    default: 'Basic'
  },
  // Which in-app notifications the user wants (Settings > Notifications)
  notificationPreferences: {
    budgetAlerts: {
      type: Boolean,
      default: true
    },
    stockAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip hashing if password is not modified or if using Google OAuth
  if (!this.isModified('password')) return next();
  
  // Skip hashing if no password (Google OAuth users)
  if (!this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) return false;
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error) {
    return false;
  }
};

// Never send secrets to a client, whichever route serialises the user
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.tokensValidAfter;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);