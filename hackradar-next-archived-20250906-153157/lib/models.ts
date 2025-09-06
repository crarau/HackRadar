import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String },
  files: [{
    name: String,
    type: String,
    size: Number,
    content: String,
  }],
  submittedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'analyzing', 'completed'], 
    default: 'pending' 
  },
  evaluation: {
    overallScore: Number,
    criteria: [{
      name: String,
      score: Number,
      maxScore: Number,
      feedback: String,
      category: String,
    }],
    feedback: String,
    strengths: [String],
    improvements: [String],
    evaluatedAt: Date,
  },
});

export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);