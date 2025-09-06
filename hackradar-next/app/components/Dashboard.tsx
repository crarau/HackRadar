import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { FiUpload, FiFile, FiX, FiLogOut, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { User, Evaluation } from '../types';
import './Dashboard.css';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [teamName, setTeamName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} file(s) added`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/*': ['.txt', '.md', '.json'],
    },
    maxSize: 10485760, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter your team name');
      return;
    }

    if (files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('teamName', teamName);
      formData.append('userId', user.id);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Submission failed');

      const submission = await response.json();
      
      // Simulate AI analysis (in production, this would be real-time updates via WebSocket)
      toast.success('Files uploaded! Analyzing...');
      
      setTimeout(() => {
        // Mock evaluation result
        const mockEvaluation: Evaluation = {
          id: '1',
          submissionId: submission.id,
          overallScore: 85,
          criteria: [
            { name: 'Technical Innovation', score: 8, maxScore: 10, feedback: 'Strong technical implementation', category: 'technical' },
            { name: 'Business Viability', score: 9, maxScore: 10, feedback: 'Clear market opportunity', category: 'business' },
            { name: 'Presentation Quality', score: 8, maxScore: 10, feedback: 'Well-structured pitch', category: 'presentation' },
            { name: 'Innovation Factor', score: 9, maxScore: 10, feedback: 'Novel approach to problem', category: 'innovation' },
          ],
          feedback: 'Your project shows great potential! The technical implementation is solid and the business case is compelling.',
          strengths: [
            'Clear problem statement',
            'Innovative solution approach',
            'Strong technical architecture',
            'Good market research'
          ],
          improvements: [
            'Consider adding more user validation',
            'Expand on the monetization strategy',
            'Include competitive analysis',
            'Add more technical diagrams'
          ],
          evaluatedAt: new Date()
        };

        setEvaluation(mockEvaluation);
        setIsAnalyzing(false);
        toast.success('Analysis complete!');
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left" onClick={onLogout} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="HackRadar" className="dashboard-logo" />
          <h1>HackRadar Dashboard</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <img src={user.picture} alt={user.name} className="user-avatar" />
            <span>{user.name}</span>
          </div>
          <button onClick={onLogout} className="logout-btn">
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="submission-section">
          <h2>Submit Your Project</h2>
          
          <div className="team-input">
            <label>Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              className="team-name-input"
            />
          </div>

          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            <FiUpload className="upload-icon" />
            <p>Drag & drop files here, or click to select</p>
            <span className="file-types">
              Supports: PDF, Images, DOC, DOCX, TXT, MD
            </span>
          </div>

          {files.length > 0 && (
            <div className="files-list">
              <h3>Uploaded Files ({files.length})</h3>
              {files.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="file-item"
                >
                  <FiFile className="file-icon" />
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="remove-file"
                  >
                    <FiX />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || files.length === 0 || !teamName}
            className="submit-btn"
          >
            {isAnalyzing ? (
              <>
                <FiRefreshCw className="spinning" />
                Analyzing...
              </>
            ) : (
              <>
                <FiTrendingUp />
                Get AI Evaluation
              </>
            )}
          </button>
        </div>

        {evaluation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="evaluation-section"
          >
            <h2>AI Evaluation Results</h2>
            
            <div className="overall-score">
              <div className="score-circle">
                <svg viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#1a1a2e"
                    strokeWidth="10"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="10"
                    strokeDasharray={`${evaluation.overallScore * 5.65} 565`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                  <text
                    x="100"
                    y="100"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="score-text"
                  >
                    {evaluation.overallScore}
                  </text>
                </svg>
                <div className="score-label">Overall Score</div>
              </div>
            </div>

            <div className="criteria-grid">
              {evaluation.criteria.map((criterion, index) => (
                <div key={index} className="criterion-card">
                  <h4>{criterion.name}</h4>
                  <div className="criterion-score">
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{
                          width: `${(criterion.score / criterion.maxScore) * 100}%`
                        }}
                      />
                    </div>
                    <span className="score-value">
                      {criterion.score}/{criterion.maxScore}
                    </span>
                  </div>
                  <p className="criterion-feedback">{criterion.feedback}</p>
                </div>
              ))}
            </div>

            <div className="feedback-section">
              <div className="feedback-card">
                <h3>Overall Feedback</h3>
                <p>{evaluation.feedback}</p>
              </div>

              <div className="feedback-columns">
                <div className="feedback-card strengths">
                  <h3>Strengths</h3>
                  <ul>
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="feedback-card improvements">
                  <h3>Areas for Improvement</h3>
                  <ul>
                    {evaluation.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;