'use client';

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiUploadCloud, FiTrendingUp, FiAward, FiLogOut, FiRefreshCw, FiEdit2, FiCheck, FiX as FiCancel } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import Timeline from './components/Timeline';
import UpdateForm from './components/UpdateForm';
import './App.css';

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
  }>;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [teamName, setTeamName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [project, setProject] = useState<{
    _id: string;
    teamName: string;
    email: string;
    websiteUrl?: string;
  } | null>(null);
  const [timeline, setTimeline] = useState<Array<{
    _id: string;
    type: string;
    content?: string;
    description?: string;
    createdAt: string;
    files?: Array<{
      name: string;
      type: string;
      isImage: boolean;
    }>;
  }>>([]);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [editedWebsiteUrl, setEditedWebsiteUrl] = useState('');

  // Load user and project from localStorage on mount
  React.useEffect(() => {
    // Check for saved user
    const savedUser = localStorage.getItem('hackradar_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      
      // Check for existing projects by email
      fetch('/api/projects')
        .then(res => res.json())
        .then(projects => {
          const userProject = projects.find((p: { email: string; teamName: string; _id: string; websiteUrl?: string }) => p.email === userData.email);
          if (userProject) {
            setProject(userProject);
            setTeamName(userProject.teamName);
            setWebsiteUrl(userProject.websiteUrl || '');
            localStorage.setItem('hackradar_project', JSON.stringify(userProject));
            
            // Load timeline
            fetch(`/api/timeline?projectId=${userProject._id}`)
              .then(res => res.json())
              .then(data => setTimeline(data))
              .catch(err => console.error('Error loading timeline:', err));
          }
        })
        .catch(err => console.error('Error loading projects:', err));
    } else {
      // Check for saved project even if no user
      const savedProject = localStorage.getItem('hackradar_project');
      if (savedProject) {
        const projectData = JSON.parse(savedProject);
        setProject(projectData);
        setTeamName(projectData.teamName);
        
        // Load timeline
        fetch(`/api/timeline?projectId=${projectData._id}`)
          .then(res => res.json())
          .then(data => setTimeline(data))
          .catch(err => console.error('Error loading timeline:', err));
      }
    }
  }, []);

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

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const userData: User = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      setUser(userData);
      localStorage.setItem('hackradar_user', JSON.stringify(userData));
      
      // Check for existing projects by email
      const res = await fetch('/api/projects');
      const projects = await res.json();
      const userProject = projects.find((p: { email: string; teamName: string; _id: string; websiteUrl?: string }) => p.email === userData.email);
      
      if (userProject) {
        setProject(userProject);
        setTeamName(userProject.teamName);
        setWebsiteUrl(userProject.websiteUrl || '');
        localStorage.setItem('hackradar_project', JSON.stringify(userProject));
        
        // Load timeline
        const timelineRes = await fetch(`/api/timeline?projectId=${userProject._id}`);
        const timelineData = await timelineRes.json();
        setTimeline(timelineData);
        
        toast.success(`Welcome back, ${userData.name}! Found your team: ${userProject.teamName}`);
      } else {
        toast.success(`Welcome, ${userData.name}!`);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowDashboard(false);
    setProject(null);
    setTimeline([]);
    setFiles([]);
    setTeamName('');
    setEvaluation(null);
    setUpdateText('');
    localStorage.removeItem('hackradar_user');
    localStorage.removeItem('hackradar_project');
    toast.success('Logged out successfully');
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter your team name');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Check if project exists
      const getRes = await fetch('/api/projects');
      const projects = await getRes.json();
      const existing = projects.find((p: { teamName: string; _id: string }) => p.teamName === teamName);
      
      if (existing) {
        setProject(existing);
        setWebsiteUrl(existing.websiteUrl || '');
        localStorage.setItem('hackradar_project', JSON.stringify(existing));
        // Load timeline
        const timelineRes = await fetch(`/api/timeline?projectId=${existing._id}`);
        const timelineData = await timelineRes.json();
        setTimeline(timelineData);
        toast.success(`Welcome back, ${teamName}!`);
      } else {
        // Create new project
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName, email: user?.email || 'test@test.com' })
        });
        
        const projectData = await projectRes.json();
        if (projectData.project) {
          setProject(projectData.project);
          localStorage.setItem('hackradar_project', JSON.stringify(projectData.project));
          toast.success(`Team "${teamName}" created successfully!`);
        }
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!editedTeamName.trim() || editedTeamName === project.teamName) {
      setIsEditingTeamName(false);
      return;
    }

    try {
      // Update project in database (you might need to create this API endpoint)
      const updatedProject = { ...project, teamName: editedTeamName };
      setProject(updatedProject);
      setTeamName(editedTeamName);
      localStorage.setItem('hackradar_project', JSON.stringify(updatedProject));
      
      toast.success('Team name updated!');
      setIsEditingTeamName(false);
    } catch (error) {
      console.error('Error updating team name:', error);
      toast.error('Failed to update team name');
    }
  };

  const handleUpdateWebsiteUrl = async () => {
    if (editedWebsiteUrl === websiteUrl) {
      setIsEditingWebsite(false);
      return;
    }

    try {
      // Update project with website URL
      const updatedProject = { ...project, websiteUrl: editedWebsiteUrl };
      setProject(updatedProject);
      setWebsiteUrl(editedWebsiteUrl);
      localStorage.setItem('hackradar_project', JSON.stringify(updatedProject));
      
      // Update in database
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project._id,
          websiteUrl: editedWebsiteUrl 
        })
      });
      
      toast.success('Website URL updated!');
      setIsEditingWebsite(false);
    } catch (error) {
      console.error('Error updating website URL:', error);
      toast.error('Failed to update website URL');
    }
  };

  const handleSubmitUpdate = async () => {
    if (!updateText.trim()) {
      toast.error('Please enter an update');
      return;
    }

    if (!project) {
      toast.error('Please create a team first');
      return;
    }

    setIsSubmittingUpdate(true);
    try {
      const formData = new FormData();
      formData.append('projectId', project._id);
      formData.append('type', 'text');
      formData.append('content', updateText);
      formData.append('description', updateText);
      
      await fetch('/api/timeline', {
        method: 'POST',
        body: formData
      });

      // Reload timeline
      const timelineRes = await fetch(`/api/timeline?projectId=${project._id}`);
      const timelineData = await timelineRes.json();
      setTimeline(timelineData);
      
      // Get fresh assessment
      const assessRes = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project._id })
      });

      const assessData = await assessRes.json();
      setEvaluation(assessData.assessment);
      
      toast.success('Update submitted!');
      setUpdateText(''); // Clear the input
    } catch (error) {
      console.error('Error submitting update:', error);
      toast.error('Failed to submit update. Please try again.');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter your team name');
      return;
    }

    setIsAnalyzing(true);

    try {
      let currentProject = project;
      
      // Create project if not exists
      if (!currentProject) {
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName, email: user?.email || 'test@test.com' })
        });
        
        const projectData = await projectRes.json();
        if (projectData.error) {
          // Project exists, try to get it
          const getRes = await fetch('/api/projects');
          const projects = await getRes.json();
          const existing = projects.find((p: { teamName: string; _id: string }) => p.teamName === teamName);
          if (existing) {
            currentProject = existing;
            setProject(existing);
          }
        } else {
          currentProject = projectData.project;
          setProject(projectData.project);
        }
      }

      // Add timeline entries for files
      if (currentProject && files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('projectId', currentProject._id);
          formData.append('type', file.type.startsWith('image/') ? 'image' : 'file');
          formData.append('file', file);
          formData.append('description', `Uploaded ${file.name}`);
          
          await fetch('/api/timeline', {
            method: 'POST',
            body: formData
          });
        }
      }

      // Get timeline entries
      if (currentProject) {
        const timelineRes = await fetch(`/api/timeline?projectId=${currentProject._id}`);
        const timelineData = await timelineRes.json();
        setTimeline(timelineData);
      }

      // Get assessment
      if (currentProject) {
        const assessRes = await fetch('/api/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: currentProject._id })
        });

        const assessData = await assessRes.json();
        setEvaluation(assessData.assessment);
      }
      
      toast.success('Analysis complete!');
      setFiles([]); // Clear files after successful submission

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#00d4ff',
              border: '1px solid #00d4ff',
            },
          }}
        />
        
        <AnimatePresence mode="wait">
          {!user ? (
            // Landing Page
            <div className="landing-page">
              <div className="pulse-background">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="pulse-ring" style={{ animationDelay: `${i * 0.5}s` }} />
                ))}
              </div>

              <motion.header
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="landing-header"
              >
                <div className="logo-container">
                  <FiZap className="logo" />
                  <h1>HackRadar</h1>
                </div>
                <div className="header-tagline">Real-Time AI Evaluation for Hackathons</div>
              </motion.header>

              <main className="landing-main">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="hero-section"
                >
                  <h2 className="hero-title">
                    <span className="gradient-text">Track Your Progress</span>
                    <br />
                    <span className="highlight">Win the Hackathon</span>
                  </h2>
                  
                  <p className="hero-description">
                    Get instant AI-powered feedback on your hackathon project.
                    Upload your pitch deck, code, or documentation and receive
                    real-time evaluation across multiple criteria.
                  </p>

                  <div className="cta-container">
                    <GoogleLogin
                      onSuccess={handleLoginSuccess}
                      onError={() => console.log('Login Failed')}
                      theme="filled_black"
                      size="large"
                      text="continue_with"
                      shape="pill"
                    />
                    <div className="login-note">Sign in with Google to get started</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="features-grid"
                >
                  <div className="feature-card">
                    <FiZap className="feature-icon" />
                    <h3>Instant Analysis</h3>
                    <p>Get feedback in under 30 seconds using advanced AI agents</p>
                  </div>

                  <div className="feature-card">
                    <FiUploadCloud className="feature-icon" />
                    <h3>Any Format</h3>
                    <p>Upload PDFs, images, websites, or any digital content</p>
                  </div>

                  <div className="feature-card">
                    <FiTrendingUp className="feature-icon" />
                    <h3>Track Progress</h3>
                    <p>Monitor your score evolution throughout the hackathon</p>
                  </div>

                  <div className="feature-card">
                    <FiAward className="feature-icon" />
                    <h3>Compete Live</h3>
                    <p>See real-time leaderboard and compete with other teams</p>
                  </div>
                </motion.div>
              </main>
            </div>
          ) : (
            // Dashboard
            <div className="dashboard">
              <header className="dashboard-header">
                <div className="header-left" onClick={handleLogout}>
                  <FiZap className="dashboard-logo" />
                  <h1>HackRadar Dashboard</h1>
                </div>
                <div className="header-right">
                  <div className="user-info">
                    <img src={user.picture} alt={user.name} className="user-avatar" />
                    <span>{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="logout-btn">
                    <FiLogOut /> Logout
                  </button>
                </div>
              </header>

              <main className="dashboard-main">
                {!project ? (
                  // Step 1: Ask for team name only
                  <div className="submission-section">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-6">Create or Join Your Team</h2>
                    
                    <div className="team-input">
                      <label>TEAM NAME</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateTeam();
                          }
                        }}
                        className="team-name-input"
                        placeholder="Enter your team name"
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={handleCreateTeam}
                      disabled={isAnalyzing || !teamName.trim()}
                      className="submit-btn"
                    >
                      {isAnalyzing ? (
                        <>
                          <FiRefreshCw className="spinning" />
                          Creating Team...
                        </>
                      ) : (
                        <>
                          <FiTrendingUp />
                          Submit Team Name
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  // Step 2: Show update form after team is created
                  <div className="submission-section">
                    <h2 className="flex items-center gap-4 text-2xl font-bold text-white mb-2">
                      {isEditingTeamName ? (
                        <>
                          <input
                            type="text"
                            value={editedTeamName}
                            onChange={(e) => setEditedTeamName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTeamName();
                              if (e.key === 'Escape') setIsEditingTeamName(false);
                            }}
                            className="bg-black/30 border border-cyan-400 rounded-lg p-2 text-white text-2xl font-bold outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleUpdateTeamName}
                            className="bg-transparent border-none text-green-400 cursor-pointer text-xl hover:text-green-300"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => setIsEditingTeamName(false)}
                            className="bg-transparent border-none text-red-400 cursor-pointer text-xl hover:text-red-300"
                          >
                            <FiCancel />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-white">Team: {project.teamName}</span>
                          <button
                            onClick={() => {
                              setIsEditingTeamName(true);
                              setEditedTeamName(project.teamName);
                            }}
                            className="bg-transparent border-none text-cyan-400 cursor-pointer text-base opacity-70 transition-opacity hover:opacity-100"
                          >
                            <FiEdit2 />
                          </button>
                        </>
                      )}
                    </h2>
                    
                    <div className="mb-4 flex items-center gap-4">
                      {isEditingWebsite ? (
                        <>
                          <input
                            type="url"
                            value={editedWebsiteUrl}
                            onChange={(e) => setEditedWebsiteUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateWebsiteUrl();
                              if (e.key === 'Escape') setIsEditingWebsite(false);
                            }}
                            className="flex-1 bg-black bg-opacity-30 border border-cyan-400 rounded-lg p-2 text-white outline-none"
                            placeholder="https://your-project-website.com"
                            autoFocus
                          />
                          <button
                            onClick={handleUpdateWebsiteUrl}
                            className="bg-transparent border-none text-green-400 cursor-pointer text-xl hover:text-green-300"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => setIsEditingWebsite(false)}
                            className="bg-transparent border-none text-red-400 cursor-pointer text-xl hover:text-red-300"
                          >
                            <FiCancel />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-cyan-400 text-sm">
                            Website: {websiteUrl || 'Not set'}
                          </span>
                          <button
                            onClick={() => {
                              setIsEditingWebsite(true);
                              setEditedWebsiteUrl(websiteUrl || '');
                            }}
                            className="bg-transparent border-none text-cyan-400 cursor-pointer text-base opacity-70 transition-opacity hover:opacity-100"
                          >
                            <FiEdit2 />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="mb-8 text-cyan-400 text-sm">
                      Project ID: {project._id}
                    </div>
                    
                    <UpdateForm 
                      projectId={project._id}
                      websiteUrl={websiteUrl}
                      onSubmit={async (formData) => {
                        const response = await fetch('/api/timeline', {
                          method: 'POST',
                          body: formData
                        });
                        
                        if (response.ok) {
                          // Reload timeline
                          const timelineRes = await fetch(`/api/timeline?projectId=${project._id}`);
                          const timelineData = await timelineRes.json();
                          setTimeline(timelineData);
                          
                          // Get fresh assessment
                          const assessRes = await fetch('/api/assess', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ projectId: project._id })
                          });

                          const assessData = await assessRes.json();
                          setEvaluation(assessData.assessment);
                        } else {
                          throw new Error('Failed to submit');
                        }
                      }}
                    />
                  </div>
                )}

                {project && timeline.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Timeline entries={timeline} teamName={project.teamName} />
                  </motion.div>
                )}

                {evaluation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="submission-section"
                  >
                    <h2 className="text-2xl font-bold text-cyan-400 mb-6">AI Evaluation Results</h2>
                    
                    <div className="text-center mb-8">
                      <div className="text-6xl font-bold text-cyan-400">
                        {evaluation.overallScore}
                      </div>
                      <div className="text-gray-500">Overall Score</div>
                    </div>

                    <div className="mb-8">
                      <p className="text-white leading-relaxed">{evaluation.feedback}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-green-400 mb-4">Strengths</h3>
                        {evaluation.strengths.map((strength, i) => (
                          <div key={i} className="text-gray-400 mb-2">
                            ✓ {strength}
                          </div>
                        ))}
                      </div>
                      <div>
                        <h3 className="text-orange-400 mb-4">Improvements</h3>
                        {evaluation.improvements.map((improvement, i) => (
                          <div key={i} className="text-gray-400 mb-2">
                            • {improvement}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </main>
            </div>
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}