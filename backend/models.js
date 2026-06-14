const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
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
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  input: {
    type: String,
    default: ''
  },
  sandbox: {
    compiled: Boolean,
    compile_output: String,
    execution_output: String,
    execution_error: String,
    exit_code: Number,
    run_time_ms: Number,
    success: Boolean
  },
  staticAnalysis: [
    {
      severity: String,
      line: Number,
      offset: Number,
      message: String,
      text: String
    }
  ],
  aiReport: {
    detectedLanguage: String,
    bugs: [
      {
        line: Number,
        severity: String,
        description: String,
        fix: String
      }
    ],
    fixedCode: String,
    securityIssues: [
      {
        category: String,
        severity: String,
        lines: String,
        description: String,
        remediation: String
      }
    ],
    generalReview: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', UserSchema);
const Report = mongoose.model('Report', ReportSchema);

module.exports = { User, Report };
