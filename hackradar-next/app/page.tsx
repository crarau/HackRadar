'use client';

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiUploadCloud, FiTrendingUp, FiLogOut, FiRefreshCw, FiEdit2, FiCheck, FiX as FiCancel, FiLink } from 'react-icons/fi';
import { IconBrandGoogle } from '@tabler/icons-react';
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
    text?: string;
    url?: string;
    files?: Array<{
      name: string;
      type: string;
      size: number;
      data: string;
      isImage: boolean;
    }>;
    evaluation?: {
      scores: {
        clarity: number;
        problem_value: number;
        feasibility_signal: number;
        originality: number;
        impact_convert: number;
        submission_readiness: number;
        final_score: number;
      };
      evidence: string[];
      gaps: string[];
      raw_ai_response?: string;
      evaluated_at: string;
    };
  }>>([]);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [editedWebsiteUrl, setEditedWebsiteUrl] = useState('');
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [websiteChanged, setWebsiteChanged] = useState(false);

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
            setEditedWebsiteUrl(userProject.websiteUrl || '');
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




  const handleLoginSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) {
        toast.error('No credential received');
        return;
      }
      
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
        setEditedWebsiteUrl(userProject.websiteUrl || '');
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
    setProject(null);
    setTimeline([]);
    setTeamName('');
    setEvaluation(null);
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
    if (!project || !editedTeamName.trim() || editedTeamName === project.teamName) {
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

  const handleUpdateWebsiteUrl = async (newUrl?: string) => {
    const urlToUpdate = newUrl !== undefined ? newUrl : editedWebsiteUrl;
    
    if (!project || urlToUpdate === websiteUrl) {
      setWebsiteChanged(false);
      return;
    }
    
    setIsSavingWebsite(true);
    try {
      // Update project with website URL
      const updatedProject = { ...project, websiteUrl: urlToUpdate };
      setProject(updatedProject);
      setWebsiteUrl(urlToUpdate);
      localStorage.setItem('hackradar_project', JSON.stringify(updatedProject));
      
      // Update in database
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project._id,
          websiteUrl: urlToUpdate 
        })
      });
      
      setWebsiteChanged(false);
      toast.success('Saved!', {
        duration: 2000,
        icon: '✅',
      });
    } catch (error) {
      console.error('Error updating website URL:', error);
      toast.error('Failed to save website URL');
    } finally {
      setIsSavingWebsite(false);
    }
  };

  // Auto-save with debounce
  React.useEffect(() => {
    if (websiteChanged && editedWebsiteUrl !== websiteUrl) {
      const timer = setTimeout(() => {
        handleUpdateWebsiteUrl(editedWebsiteUrl);
      }, 1500); // Auto-save after 1.5 seconds of no typing
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedWebsiteUrl, websiteChanged]);

  // Bouncing balls physics engine
  React.useEffect(() => {
    if (!user) { // Only run on landing page
      const balls = [
        { x: 10, y: 20, vx: 0.8, vy: 0.6, id: 1 },
        { x: 80, y: 70, vx: -0.5, vy: -0.4, id: 2 },
        { x: 50, y: 30, vx: 0.7, vy: -0.8, id: 3 }
      ];

      const updateBalls = () => {
        balls.forEach(ball => {
          // Update position
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Bounce off edges (with some padding for the gradient size)
          if (ball.x <= 5 || ball.x >= 95) {
            ball.vx = -ball.vx;
            ball.x = Math.max(5, Math.min(95, ball.x));
          }
          if (ball.y <= 5 || ball.y >= 95) {
            ball.vy = -ball.vy;
            ball.y = Math.max(5, Math.min(95, ball.y));
          }
        });

        // Update CSS variables
        const landingPage = document.querySelector('.landing-page') as HTMLElement;
        if (landingPage) {
          landingPage.style.setProperty('--x1', `${balls[0].x}%`);
          landingPage.style.setProperty('--y1', `${balls[0].y}%`);
          landingPage.style.setProperty('--x2', `${balls[1].x}%`);
          landingPage.style.setProperty('--y2', `${balls[1].y}%`);
          landingPage.style.setProperty('--x3', `${balls[2].x}%`);
          landingPage.style.setProperty('--y3', `${balls[2].y}%`);
        }
      };

      const animationId = setInterval(updateBalls, 16); // ~60fps

      return () => clearInterval(animationId);
    }
  }, [user]);



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
                <a 
                  href="/public-dashboard" 
                  className="dashboard-link"
                  style={{
                    position: 'absolute',
                    right: '2rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(0, 212, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🏆 View Live Dashboard
                </a>
              </motion.header>

              <main className="landing-main">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="hero-section"
                >
                  <h2 className="hero-title">
                    <span className="gradient-text">Real-Time AI Evaluation</span>
                    <br />
                    <span className="highlight">For Hackathon Teams</span>
                  </h2>
                  
                  <p className="hero-description">
                    Upload your project updates, screenshots, or pitch materials and receive instant AI-powered evaluation
                    with specific, actionable feedback to improve your submission. Track your progress in real-time
                    and see exactly how to strengthen your project.
                  </p>

                  <div className="cta-container">
                    <div style={{
                      transform: 'scale(1.1)',
                      padding: '0',
                      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(0, 255, 136, 0.06))',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      boxShadow: '0 6px 24px rgba(0, 212, 255, 0.12)',
                      animation: 'pulse 2s ease-in-out infinite',
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <GoogleLogin
                        onSuccess={handleLoginSuccess}
                        onError={() => console.log('Login Failed')}
                        theme="filled_black"
                        size="large"
                        text="continue_with"
                        shape="pill"
                      />
                    </div>
                    <div className="login-note" style={{ 
                      fontSize: '1.1rem', 
                      marginTop: '1.5rem',
                      fontWeight: '600'
                    }}>
                      🚀 Sign in to start receiving AI-powered feedback for your hackathon project
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="features-grid"
                >
                  <div className="feature-card">
                    <div className="feature-number">1</div>
                    <FiUploadCloud className="feature-icon" />
                    <h3>Upload Anything</h3>
                    <p>Share screenshots, pitch decks, URLs, or just describe what you&apos;re building</p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-number">2</div>
                    <FiZap className="feature-icon" />
                    <h3>Get Smart Analysis</h3>
                    <p>AI analyzes your project and identifies specific areas for improvement</p>
                  </div>

                  <div className="feature-card">
                    <div className="feature-number">3</div>
                    <FiTrendingUp className="feature-icon" />
                    <h3>Improve & Win</h3>
                    <p>Follow the actionable feedback, resubmit, and watch your score climb</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="access-button-container"
                >
                  <div className="access-buttons-container">
                    <a 
                      href="/technical-journey" 
                      className="access-button"
                    >
                      🚀 How We Built This in 12 Hours
                    </a>
                    <a 
                      href="/hackradar-access.html" 
                      className="access-button"
                    >
                      🔓 Access Team Portal
                    </a>
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
                    
                    <div className="team-input" style={{ marginBottom: '2rem' }}>
                      <label style={{ marginBottom: '0.75rem', display: 'block' }}>TEAM NAME</label>
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
                        style={{ marginBottom: '0' }}
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
                    
                    {/* Display current score from latest timeline entry */}
                    {timeline.length > 0 && (() => {
                      // Find the latest entry with a score (timeline is already sorted newest first)
                      const latestWithScore = timeline
                        .find(entry => entry.evaluation?.scores?.final_score !== undefined);
                      
                      // Debug: Log which entry is being used for display
                      if (latestWithScore) {
                        console.log('💯 [UI] Displaying scores from entry:', latestWithScore._id, 'Score:', latestWithScore.evaluation?.scores?.final_score, 'Created:', latestWithScore.createdAt);
                      }
                      
                      if (latestWithScore?.evaluation?.scores) {
                        const scores = latestWithScore.evaluation.scores;
                        // Delta is not stored in new structure - can be calculated if needed
                        
                        return (
                          <div className="score-display mb-6" style={{
                            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.05))',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1.5rem'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                fontSize: '4rem', 
                                fontWeight: 'bold',
                                background: 'linear-gradient(45deg, #00d4ff, #00ff88)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '0.5rem',
                                textShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
                              }}>
                                {scores.final_score}/100
                              </div>
                              <div style={{ 
                                marginTop: '1rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '1rem',
                                fontSize: '1rem'
                              }}>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clarity</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.clarity}/15
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Problem</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.problem_value}/20
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feasibility</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.feasibility_signal}/15
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Originality</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.originality}/15
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impact</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.impact_convert}/20
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: '#999', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Readiness</div>
                                  <div style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {scores.submission_readiness || 0}/15
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="mb-6">
                      <style jsx>{`
                        .website-url-section {
                          display: flex;
                          flex-direction: column;
                          gap: 0.5rem;
                        }
                        
                        .website-label {
                          display: flex;
                          align-items: center;
                          gap: 0.5rem;
                          color: #00d4ff;
                          font-size: 0.9rem;
                          text-transform: uppercase;
                          letter-spacing: 1px;
                        }
                        
                        .website-input-wrapper {
                          position: relative;
                        }
                        
                        .website-input {
                          width: 100%;
                          padding: 0.75rem;
                          padding-right: 3rem;
                          background: rgba(0, 0, 0, 0.3);
                          border: 1px solid rgba(0, 212, 255, 0.3);
                          border-radius: 8px;
                          color: #ffffff;
                          font-size: 1rem;
                          transition: all 0.3s ease;
                          font-family: inherit;
                        }
                        
                        .website-input:focus {
                          outline: none;
                          border-color: #00d4ff;
                          box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
                        }
                        
                        .website-input::placeholder {
                          color: rgba(255, 255, 255, 0.3);
                        }
                        
                        .edit-button {
                          position: absolute;
                          right: 0.75rem;
                          top: 50%;
                          transform: translateY(-50%);
                          background: transparent;
                          border: none;
                          color: #00d4ff;
                          cursor: pointer;
                          opacity: 0.7;
                          transition: opacity 0.3s ease;
                          padding: 0.25rem;
                        }
                        
                        .edit-button:hover {
                          opacity: 1;
                        }
                        
                        .action-buttons {
                          position: absolute;
                          right: 0.75rem;
                          top: 50%;
                          transform: translateY(-50%);
                          display: flex;
                          gap: 0.5rem;
                        }
                        
                        .action-button {
                          background: transparent;
                          border: none;
                          cursor: pointer;
                          padding: 0.25rem;
                          transition: all 0.3s ease;
                        }
                        
                        .save-button {
                          color: #00ff88;
                        }
                        
                        .cancel-button {
                          color: #ff6b6b;
                        }
                        
                        .action-button:hover {
                          transform: scale(1.1);
                        }
                        
                        @keyframes spin {
                          from { transform: rotate(0deg); }
                          to { transform: rotate(360deg); }
                        }
                        
                        .spinning {
                          animation: spin 1s linear infinite;
                        }
                        
                        .has-changes {
                          animation: pulse 2s ease-in-out infinite;
                        }
                        
                        @keyframes pulse {
                          0%, 100% { opacity: 1; }
                          50% { opacity: 0.8; }
                        }
                      `}</style>
                      
                      <div className="website-url-section">
                        <label className="website-label">
                          <FiLink className="text-base" />
                          WEBSITE URL
                        </label>
                        
                        <div className="website-input-wrapper">
                          <input
                            type="url"
                            value={editedWebsiteUrl}
                            onChange={(e) => {
                              setEditedWebsiteUrl(e.target.value);
                              setWebsiteChanged(true);
                            }}
                            onFocus={() => {
                              if (!editedWebsiteUrl && websiteUrl) {
                                setEditedWebsiteUrl(websiteUrl);
                              }
                            }}
                            className={`website-input ${websiteChanged && editedWebsiteUrl !== websiteUrl ? 'has-changes' : ''}`}
                            placeholder="https://your-project-website.com"
                            style={{
                              borderColor: websiteChanged && editedWebsiteUrl !== websiteUrl ? '#ffa500' : 
                                          isSavingWebsite ? '#00ff88' : undefined,
                              backgroundColor: websiteChanged && editedWebsiteUrl !== websiteUrl ? 'rgba(255, 165, 0, 0.05)' :
                                              isSavingWebsite ? 'rgba(0, 255, 136, 0.05)' : undefined
                            }}
                          />
                          <div className="edit-button" style={{
                            color: websiteChanged && editedWebsiteUrl !== websiteUrl ? '#ffa500' :
                                   isSavingWebsite ? '#00ff88' : '#00d4ff',
                            opacity: 1
                          }}>
                            {isSavingWebsite ? (
                              <FiRefreshCw size={16} className="spinning" style={{animation: 'spin 1s linear infinite'}} />
                            ) : websiteChanged && editedWebsiteUrl !== websiteUrl ? (
                              <FiEdit2 size={16} />
                            ) : (
                              <FiCheck size={16} />
                            )}
                          </div>
                        </div>
                        {websiteChanged && editedWebsiteUrl !== websiteUrl && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#ffa500',
                            fontStyle: 'italic'
                          }}>
                            Auto-saving in a moment...
                          </div>
                        )}
                        {!websiteChanged && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontStyle: 'italic'
                          }}>
                            Click to edit • Changes save automatically
                          </div>
                        )}
                      </div>
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
                          const responseData = await response.json();
                          
                          console.log('\n📥 [UI] Response from timeline API:', responseData);
                          if (responseData.evaluation) {
                            console.log('  🎯 Evaluation scores received:', responseData.evaluation.scores);
                            console.log('  🎯 Final score:', responseData.evaluation.scores.final_score);
                          }
                          
                          // Reload timeline
                          console.log('\n🔄 [UI] Reloading timeline...');
                          const timelineRes = await fetch(`/api/timeline?projectId=${project._id}`);
                          const timelineData = await timelineRes.json();
                          
                          console.log('\n📋 [UI] New timeline data:', timelineData);
                          if (timelineData.length > 0) {
                            const latestEntry = timelineData[0];
                            console.log('  🗺 Latest entry metadata:', latestEntry.metadata);
                            if (latestEntry.metadata?.evaluation) {
                              console.log('  🎯 Latest entry final_score:', latestEntry.metadata.evaluation.final_score);
                            }
                          }
                          
                          setTimeline(timelineData);
                          console.log('✅ [UI] Timeline state updated');
                          
                          // Get fresh assessment (optional - evaluation is already in timeline)
                          try {
                            const assessRes = await fetch('/api/assess', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ projectId: project._id })
                            });

                            if (assessRes.ok) {
                              const assessData = await assessRes.json();
                              if (assessData.assessment) {
                                setEvaluation(assessData.assessment);
                              }
                            } else {
                              // Log error but don't fail - evaluation is in timeline
                              console.warn('Assessment endpoint returned error:', await assessRes.text());
                            }
                          } catch (assessError) {
                            // Non-critical error - evaluation is already in timeline
                            console.warn('Could not fetch assessment:', assessError);
                          }
                          
                          // Return the response data (including debugLogs if present)
                          return responseData;
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