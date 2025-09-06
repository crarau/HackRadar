import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { FiZap, FiUploadCloud, FiTrendingUp, FiAward } from 'react-icons/fi';
import './LandingPage.css';

interface LandingPageProps {
  onLogin: (credentialResponse: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
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
              onSuccess={onLogin}
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