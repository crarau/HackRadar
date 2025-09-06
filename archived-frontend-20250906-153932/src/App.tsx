import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { User } from './types';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('hackradar_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      // Decode JWT token to get user info
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      
      const userData: User = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        token: credentialResponse.credential
      };

      // Save to localStorage
      localStorage.setItem('hackradar_user', JSON.stringify(userData));
      setUser(userData);
      
      // Send to backend
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      toast.success(`Welcome, ${userData.name}!`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hackradar_user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="loader"
        />
      </div>
    );
  }

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
            <LandingPage onLogin={handleLoginSuccess} />
          ) : (
            <Dashboard user={user} onLogout={handleLogout} />
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
