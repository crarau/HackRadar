import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { FiZap, FiUploadCloud, FiTrendingUp, FiAward, FiLogOut, FiActivity } from 'react-icons/fi';
import { User } from '../types';
import './LandingPage.css';

interface LandingPageProps {
  onLogin: (credentialResponse: any) => void;
  user?: User | null;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, user, onGoToDashboard, onLogout }) => {
  return (
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
          <img src="/logo.svg" alt="HackRadar" className="logo" />
          <h1>HackRadar</h1>
        </div>
        <div className="header-tagline">Real-Time AI Evaluation for Hackathons</div>
        {user && (
          <div className="logged-in-controls">
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <span>{user.name}</span>
            </div>
            <div className="nav-buttons">
              <button onClick={onGoToDashboard} className="nav-btn dashboard-btn">
                {React.createElement(FiActivity as any, { size: 16 })} Dashboard
              </button>
              <button onClick={onLogout} className="nav-btn logout-btn">
                {React.createElement(FiLogOut as any, { size: 16 })} Logout
              </button>
            </div>
          </div>
        )}
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
            {!user ? (
              <>
                <GoogleLogin
                  onSuccess={onLogin}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  shape="pill"
                />
                <div className="login-note">Sign in with Google to get started</div>
              </>
            ) : (
              <>
                <button onClick={onGoToDashboard} className="main-cta-btn">
                  {React.createElement(FiActivity as any, { size: 20 })}
                  Go to Dashboard
                </button>
                <div className="login-note">Welcome back! Ready to analyze your project?</div>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="features-grid"
        >
          <div className="feature-card">
            {React.createElement(FiZap as any, { className: "feature-icon" })}
            <h3>Instant Analysis</h3>
            <p>Get feedback in under 30 seconds using advanced AI agents</p>
          </div>

          <div className="feature-card">
            {React.createElement(FiUploadCloud as any, { className: "feature-icon" })}
            <h3>Any Format</h3>
            <p>Upload PDFs, images, websites, or any digital content</p>
          </div>

          <div className="feature-card">
            {React.createElement(FiTrendingUp as any, { className: "feature-icon" })}
            <h3>Track Progress</h3>
            <p>Monitor your score evolution throughout the hackathon</p>
          </div>

          <div className="feature-card">
            {React.createElement(FiAward as any, { className: "feature-icon" })}
            <h3>Compete Live</h3>
            <p>See real-time leaderboard and compete with other teams</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="hackathon-info"
        >
          <div className="event-badge">
            AGI Ventures Canada Hackathon 3.0
          </div>
          <div className="event-tags">
            #AGIV #AGIVenturesCanada #BuildToConvert
          </div>
        </motion.div>
      </main>

      <footer className="landing-footer">
        <p>Built with passion at Invest Ottawa</p>
      </footer>
    </div>
  );
};

export default LandingPage;