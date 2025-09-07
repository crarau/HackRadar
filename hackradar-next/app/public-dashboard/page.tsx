'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiUsers, FiZap, FiLogOut } from 'react-icons/fi';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartOptions, ChartData } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import '../App.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TeamScore {
  _id: string;
  teamName: string;
  combinedScore: number;
  scores?: {
    clarity: number;
    problem_value: number;
    feasibility: number;
    originality: number;
    impact: number;
    submission_readiness: number;
    final_score: number;
  };
  lastUpdated: string;
  entryId?: string | null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 3000, // More frequent updates to see animations
      staleTime: 2500,
    },
  },
});

// Color assignments by ranking position
const getRankColor = (position: number): { bg: string; border: string } => {
  switch(position) {
    case 0: return { bg: 'rgba(255, 193, 7, 0.9)', border: '#ffc107' }; // Gold - 1st place
    case 1: return { bg: 'rgba(192, 192, 192, 0.9)', border: '#c0c0c0' }; // Silver - 2nd place
    case 2: return { bg: 'rgba(255, 152, 0, 0.9)', border: '#ff9800' }; // Bronze - 3rd place
    default: return { bg: 'rgba(0, 212, 255, 0.8)', border: '#00d4ff' }; // Blue - rest
  }
};

// Store for maintaining score history
const scoreHistory: { [key: string]: number } = {};

// Fetch real leaderboard data from API
const fetchLeaderboardData = async (): Promise<TeamScore[]> => {
  console.log('🏆 [Dashboard] Fetching leaderboard data...');
  
  const response = await fetch('/api/leaderboard');
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard data');
  }
  
  const data = await response.json();
  console.log(`📊 [Dashboard] Received ${data.teams?.length || 0} teams`);
  
  return data.teams || [];
};

// Memoized Chart Component - only re-renders when props actually change
const TeamChart = React.memo(({ 
  teams, 
  animatingBars 
}: { 
  teams: TeamScore[], 
  animatingBars: Set<string> 
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  
  const chartData: ChartData<'bar'> = useMemo(() => ({
    labels: teams.map(() => ''), // Empty labels - we draw them ourselves
    datasets: [
      {
        label: 'Combined Score',
        data: teams.map(team => team.combinedScore),
        backgroundColor: teams.map((team, index) => {
          const isAnimating = animatingBars.has(team._id);
          const rankColor = getRankColor(index);
          // Pulse to orange when animating, keep rank color otherwise
          return isAnimating ? 'rgba(255, 165, 0, 0.9)' : rankColor.bg;
        }),
        borderColor: teams.map((team, index) => {
          const isAnimating = animatingBars.has(team._id);
          const rankColor = getRankColor(index);
          return isAnimating ? '#ffa500' : rankColor.border;
        }),
        borderWidth: 3,
        borderRadius: 12,
        barThickness: 'flex',
        maxBarThickness: 80,
      },
    ],
  }), [teams, animatingBars]);

  const options: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: animatingBars.size > 0 ? 800 : 0,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleColor: '#00d4ff',
        titleFont: { size: 16 },
        bodyColor: '#ffffff',
        bodyFont: { size: 14 },
        borderColor: '#00d4ff',
        borderWidth: 2,
        displayColors: false,
        callbacks: {
          title: (context) => {
            if (!context || !context[0]) return '';
            const index = context[0].dataIndex;
            return teams[index]?.teamName || '';
          },
          label: (context) => {
            if (!context || !Array.isArray(context) || !context[0]) return '';
            const index = context[0].dataIndex;
            const team = teams[index];
            if (!team || !team.scores) return [`Combined: ${team.combinedScore}%`];
            
            return [
              `Combined: ${team.combinedScore}%`,
              `Clarity: ${team.scores.clarity}/15`,
              `Problem Value: ${team.scores.problem_value}/20`,
              `Feasibility: ${team.scores.feasibility}/15`,
              `Originality: ${team.scores.originality}/15`,
              `Impact: ${team.scores.impact}/20`,
              `Readiness: ${team.scores.submission_readiness}/15`
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 212, 255, 0.2)',
          lineWidth: 1,
        },
        ticks: {
          color: '#00d4ff',
          font: { size: 14 },
          callback: (value) => `${value}%`,
        },
      },
      y: {
        grid: { display: false },
        ticks: { display: false },
      },
    },
    layout: {
      padding: {
        left: 60,
        right: 20,
        top: 10,
        bottom: 10,
      },
    },
  }), [teams, animatingBars]);

  // Custom draw function for labels
  const plugins = useMemo(() => [{
    id: 'customLabels',
    afterDatasetsDraw: (chart: ChartJS) => {
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      
      if (!meta || !meta.data) return;
      
      teams.forEach((team, index) => {
        const bar = meta.data[index];
        if (bar) {
          const props = bar.getProps(['x', 'y'], true);
          const { y } = props;
          
          ctx.save();
          
          // Draw ranking badge
          ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
          ctx.fillText(rankText, 30, y);
          
          // Draw team name inside bar
          ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(team.teamName, 80, y - 8);
          
          // Draw score with animation indicator
          const isAnimating = animatingBars.has(team._id);
          ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
          ctx.fillStyle = isAnimating ? '#ffa500' : '#ffffff';
          ctx.fillText(`${team.combinedScore}%`, 80, y + 12);
          
          // Draw change indicator if animating
          if (isAnimating) {
            ctx.font = '14px -apple-system, system-ui, sans-serif';
            ctx.fillStyle = '#ffa500';
            ctx.fillText('▲', 150, y + 12);
          }
          
          ctx.restore();
        }
      });
    }
  }], [teams, animatingBars]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Bar 
        ref={chartRef}
        data={chartData} 
        options={options}
        plugins={plugins}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if data actually changed
  const dataChanged = JSON.stringify(prevProps.teams) !== JSON.stringify(nextProps.teams);
  const animationChanged = prevProps.animatingBars !== nextProps.animatingBars;
  return !dataChanged && !animationChanged;
});

TeamChart.displayName = 'TeamChart';

// Separate data fetching logic
const useTeamData = () => {
  const [stableTeams, setStableTeams] = useState<TeamScore[]>([]);
  const [animatingBars, setAnimatingBars] = useState<Set<string>>(new Set());
  const previousDataRef = useRef<TeamScore[]>([]);

  // Query for data
  const { data: fetchedTeams = [], isLoading } = useQuery({
    queryKey: ['team-scores'],
    queryFn: fetchLeaderboardData,
    refetchInterval: 3000, // Check every 3 seconds
  });

  // Process data changes without causing re-renders
  useEffect(() => {
    // Deep comparison to detect actual changes
    const dataString = JSON.stringify(fetchedTeams);
    const previousString = JSON.stringify(previousDataRef.current);
    
    if (dataString === previousString) {
      return; // No actual changes, skip update
    }

    // Find changed teams (score changes)
    const changes = new Set<string>();
    fetchedTeams.forEach(team => {
      const prev = previousDataRef.current.find(p => p._id === team._id);
      if (prev && prev.combinedScore !== team.combinedScore) {
        changes.add(team._id);
      }
    });

    // Update animations if there are changes
    if (changes.size > 0) {
      setAnimatingBars(changes);
      
      // Clear animations after 2 seconds
      setTimeout(() => {
        setAnimatingBars(new Set());
      }, 2000);
    }

    // Update stable teams and previous data
    setStableTeams(fetchedTeams);
    previousDataRef.current = fetchedTeams;
  }, [fetchedTeams]);

  return { teams: stableTeams, animatingBars, isLoading };
};

const DashboardContent = () => {
  const { teams, animatingBars, isLoading } = useTeamData();
  const [showLogin, setShowLogin] = useState(false);

  // Calculate stats
  const topScore = teams.length > 0 ? teams[0].combinedScore : 0;
  const averageScore = teams.length > 0 ? Math.round(teams.reduce((sum, team) => sum + team.combinedScore, 0) / teams.length) : 0;

  const handleGoogleSuccess = (credentialResponse: any) => {
    console.log('Google login successful:', credentialResponse);
    // Redirect to dashboard after successful login
    window.location.href = '/dashboard';
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  return (
    <div style={{ 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
      color: '#ffffff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Login Section in corner */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* Google Login Button */}
        {!showLogin ? (
          <button
            onClick={() => setShowLogin(true)}
            style={{
              background: 'linear-gradient(45deg, #00d4ff, #00ff88)',
              color: '#0a0a1a',
              border: 'none',
              borderRadius: '50px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 5px 20px rgba(0, 212, 255, 0.3)',
              animation: 'pulse 2s ease-in-out infinite'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 212, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 5px 20px rgba(0, 212, 255, 0.3)';
            }}
          >
            Join HackRadar →
          </button>
        ) : (
          <div style={{
            transform: 'scale(1.2)',
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.1))',
            borderRadius: '20px',
            border: '2px solid rgba(0, 212, 255, 0.3)',
            boxShadow: '0 10px 40px rgba(0, 212, 255, 0.2)'
          }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="filled_blue"
              size="large"
              text="continue_with"
              shape="pill"
            />
          </div>
        )}
        
        {/* QR Code below */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'center',
          border: '2px solid #00d4ff',
        }}>
          <img 
            src="/api/qr-code?url=https://hackradar.me" 
            alt="Login QR Code"
            style={{ width: '100px', height: '100px', display: 'block' }}
          />
          <div style={{ 
            color: '#0a0a1a', 
            fontSize: '0.75rem', 
            fontWeight: 'bold',
            marginTop: '0.5rem'
          }}>
            Scan to Login
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingRight: '200px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <FiZap style={{ color: '#00d4ff', fontSize: '3rem' }} />
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #00d4ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0
          }}>
            Live Hackathon Leaderboard
          </h1>
        </div>
        
        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {topScore}%
            </div>
            <div style={{ color: '#ffecb3', fontSize: '0.9rem' }}>🏆 Top Score</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00d4ff' }}>
              {averageScore}%
            </div>
            <div style={{ color: '#b3e5fc', fontSize: '0.9rem' }}>📊 Average</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
              {teams.length}
            </div>
            <div style={{ color: '#c8e6c9', fontSize: '0.9rem' }}>👥 Teams</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: animatingBars.size > 0 ? '#ffa500' : '#a0a0b0'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: animatingBars.size > 0 ? '#ffa500' : '#00ff88',
                transition: 'all 0.3s ease'
              }} />
              <span style={{ fontSize: '0.9rem' }}>
                {animatingBars.size > 0 ? 'Updating...' : 'Live'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section - Takes remaining height */}
      <div style={{ 
        flex: 1,
        background: 'rgba(26, 26, 46, 0.4)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        padding: '2rem',
        marginRight: '180px',
        minHeight: 0
      }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: '4px solid rgba(0, 212, 255, 0.3)',
              borderTop: '4px solid #00d4ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : teams.length > 0 ? (
          <TeamChart teams={teams} animatingBars={animatingBars} />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#a0a0b0',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <FiUsers style={{ fontSize: '4rem', color: '#666' }} />
            <div>No teams found</div>
            <div style={{ fontSize: '1rem', color: '#666' }}>Waiting for submissions...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function PublicDashboard() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error('Google Client ID not configured');
    return (
      <QueryClientProvider client={queryClient}>
        <DashboardContent />
      </QueryClientProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <DashboardContent />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}