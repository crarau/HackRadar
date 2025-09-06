'use client';

import { useState, useCallback, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiFile, FiX, FiLogOut, FiRefreshCw, FiTrendingUp, FiZap, FiUploadCloud, FiAward, FiCamera } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '378200832535-trha0skd6g1mma6dv0rtl6o9fprjh38b.apps.googleusercontent.com';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface Evaluation {
  overallScore: number;
  criteria: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
    category: string;
  }>;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCameraFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const capturedFiles = event.target.files;
    if (capturedFiles && capturedFiles.length > 0) {
      const filesArray = Array.from(capturedFiles);
      setFiles(prev => [...prev, ...filesArray]);
      toast.success(`Photo captured!`);
    }
  };

  const handleLoginSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received');
      }
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const userData: User = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      setUser(userData);
      toast.success(`Welcome, ${userData.name}!`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter your team name');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('teamName', teamName);
      formData.append('email', user?.email || '');
      formData.append('description', description);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Submission failed');

      const result = await response.json();
      toast.success('Files uploaded! Analyzing...');
      
      // Poll for results
      const checkEvaluation = async () => {
        const evalResponse = await fetch(`/api/submissions?id=${result.id}`);
        const submission = await evalResponse.json();
        
        if (submission.status === 'completed' && submission.evaluation) {
          setEvaluation(submission.evaluation);
          setIsAnalyzing(false);
          toast.success('Analysis complete!');
        } else {
          setTimeout(checkEvaluation, 2000);
        }
      };
      
      setTimeout(checkEvaluation, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEvaluation(null);
    setFiles([]);
    setTeamName('');
    setDescription('');
    toast.success('Logged out successfully');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1b4b',
              color: '#e0e7ff',
              border: '1px solid #6366f1',
            },
          }}
        />
        
        {/* Header */}
        <header className="border-b border-indigo-500/20 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  setUser(null);
                  setEvaluation(null);
                  setFiles([]);
                  setTeamName('');
                  setDescription('');
                }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FiZap className="text-white text-xl" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  HackRadar
                </h1>
              </div>
              {user && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                    <span className="text-gray-300">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition"
                  >
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!user ? (
            // Landing Page
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
            >
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-white mb-4">
                  Real-Time AI Evaluation for Hackathons
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Get instant feedback on your project. Upload your pitch deck, code, or documentation.
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => toast.error('Login failed')}
                    theme="filled_black"
                    size="large"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mt-20">
                <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-6 text-center">
                  <FiZap className="text-4xl text-indigo-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Instant Analysis</h3>
                  <p className="text-gray-400">Get feedback in under 30 seconds using advanced AI</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-6 text-center">
                  <FiUploadCloud className="text-4xl text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Any Format</h3>
                  <p className="text-gray-400">Upload PDFs, images, websites, or any digital content</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-6 text-center">
                  <FiAward className="text-4xl text-pink-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Compete Live</h3>
                  <p className="text-gray-400">See real-time leaderboard and track your progress</p>
                </div>
              </div>
            </motion.div>
          ) : (
            // Dashboard
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
            >
              <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Submit Your Project</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      placeholder="Enter your team name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      placeholder="Describe your project..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload Files
                    </label>
                    <div className="space-y-4">
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500/30'} rounded-lg p-8 text-center cursor-pointer transition`}
                      >
                        <input {...getInputProps()} />
                        <FiUpload className="text-4xl text-indigo-400 mx-auto mb-3" />
                        <p className="text-gray-300">Drag & drop files here, or click to select</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Supports: PDF, Images, DOC, DOCX, TXT, MD (Max 10MB)
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-400 text-sm mb-2">— OR —</div>
                        <button
                          type="button"
                          onClick={handleCameraCapture}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition"
                        >
                          <FiCamera className="text-xl" />
                          Take Photo with Camera
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCameraFile}
                          className="hidden"
                        />
                        <p className="text-gray-500 text-xs mt-2">
                          Use your device camera to capture documents or screens
                        </p>
                      </div>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">
                        Uploaded Files ({files.length})
                      </h3>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-900/50 border border-indigo-500/20 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-3">
                              <FiFile className="text-indigo-400" />
                              <span className="text-gray-300">{file.name}</span>
                              <span className="text-gray-500 text-sm">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isAnalyzing || !teamName}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <FiRefreshCw className="animate-spin" />
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
              </div>

              {evaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-8 mt-8"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">AI Evaluation Results</h2>
                  
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      {evaluation.overallScore}
                    </div>
                    <div className="text-gray-400">Overall Score</div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {evaluation.criteria.map((criterion, index) => (
                      <div key={index} className="bg-slate-900/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300">{criterion.name}</span>
                          <span className="text-indigo-400 font-semibold">
                            {criterion.score}/{criterion.maxScore}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                            style={{ width: `${(criterion.score / criterion.maxScore) * 100}%` }}
                          />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">{criterion.feedback}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Overall Feedback</h3>
                      <p className="text-gray-300">{evaluation.feedback}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Strengths</h3>
                        <ul className="space-y-1">
                          {evaluation.strengths.map((strength, index) => (
                            <li key={index} className="text-gray-300 flex items-start gap-2">
                              <span className="text-green-400 mt-1">✓</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-amber-400 mb-2">Improvements</h3>
                        <ul className="space-y-1">
                          {evaluation.improvements.map((improvement, index) => (
                            <li key={index} className="text-gray-300 flex items-start gap-2">
                              <span className="text-amber-400 mt-1">•</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}