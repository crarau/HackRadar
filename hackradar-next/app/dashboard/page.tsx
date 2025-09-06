'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiImage, FiType, FiClock, FiAward, FiUpload } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

interface Project {
  _id: string;
  teamName: string;
  email: string;
  createdAt: string;
  status: string;
  lastAssessment?: {
    score: number;
    feedback: string;
  };
}

interface TimelineEntry {
  _id: string;
  type: 'text' | 'file' | 'image' | 'link';
  content: string;
  description?: string;
  fileName?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [project, setProject] = useState<Project | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [entryType, setEntryType] = useState<'text' | 'file' | 'image'>('text');
  const [entryContent, setEntryContent] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create project
  const handleCreateProject = async () => {
    if (!teamName || !email) {
      toast.error('Please enter team name and email');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setProject(data.project);
      setShowTimeline(true);
      toast.success('Project created! Now add your timeline entries.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  // Add timeline entry
  const handleAddEntry = async (): Promise<void> => {
    if (!project) return;

    if (entryType === 'text' && !entryContent) {
      toast.error('Please enter some content');
      return;
    }

    if ((entryType === 'file' || entryType === 'image') && !selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('projectId', project._id);
      formData.append('type', entryType);
      formData.append('description', entryDescription);
      
      if (entryType === 'text') {
        formData.append('content', entryContent);
      } else if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch('/api/timeline', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add entry');
      }

      setTimeline([data.entry, ...timeline]);
      setEntryContent('');
      setEntryDescription('');
      setSelectedFile(null);
      toast.success('Entry added to timeline!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assess project
  const handleAssess = async (): Promise<void> => {
    if (!project) return;

    setIsAssessing(true);
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project._id })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assess project');
      }

      setProject({ ...project, lastAssessment: data.assessment });
      toast.success('Assessment complete!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assess project');
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          HackRadar Project Timeline
        </h1>

        {!showTimeline ? (
          // Project Creation Form
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-8"
          >
            <h2 className="text-2xl font-semibold text-white mb-6">Start Your Project</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white"
                  placeholder="Enter your team name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white"
                  placeholder="team@example.com"
                />
              </div>
              
              <button
                onClick={handleCreateProject}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700"
              >
                Create Project
              </button>
            </div>
          </motion.div>
        ) : (
          // Timeline View
          <div className="space-y-6">
            {/* Project Header */}
            <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white">{project?.teamName}</h2>
              <p className="text-gray-400">{project?.email}</p>
              
              {project?.lastAssessment && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-semibold">Latest Assessment</span>
                    <span className="text-3xl font-bold text-green-400">
                      {project.lastAssessment.score}/100
                    </span>
                  </div>
                  <p className="text-gray-300 mt-2">{project.lastAssessment.feedback}</p>
                </div>
              )}
            </div>

            {/* Add Entry Form */}
            <div className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Add Timeline Entry</h3>
              
              {/* Entry Type Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setEntryType('text')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    entryType === 'text' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  <FiType /> Text
                </button>
                <button
                  onClick={() => setEntryType('file')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    entryType === 'file' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  <FiFile /> File
                </button>
                <button
                  onClick={() => setEntryType('image')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    entryType === 'image' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  <FiImage /> Image
                </button>
              </div>

              {/* Entry Content */}
              {entryType === 'text' ? (
                <textarea
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white mb-4"
                  rows={4}
                  placeholder="Enter your update..."
                />
              ) : (
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept={entryType === 'image' ? 'image/*' : '*'}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-indigo-500/30 rounded-lg text-gray-400 hover:border-indigo-500/50 transition"
                  >
                    {selectedFile ? (
                      <span className="text-white">{selectedFile.name}</span>
                    ) : (
                      <>
                        <FiUpload className="mx-auto text-3xl mb-2" />
                        <p>Click to select {entryType}</p>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Description */}
              <input
                type="text"
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg text-white mb-4"
                placeholder="Brief description (optional)"
              />

              {/* Submit Button */}
              <button
                onClick={handleAddEntry}
                disabled={isSubmitting}
                className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add to Timeline'}
              </button>
            </div>

            {/* Assessment Button */}
            <button
              onClick={handleAssess}
              disabled={isAssessing || timeline.length === 0}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiAward />
              {isAssessing ? 'Assessing...' : 'Get AI Assessment'}
            </button>

            {/* Timeline Display */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Timeline</h3>
              {timeline.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No entries yet. Add your first update above!</p>
              ) : (
                <AnimatePresence>
                  {timeline.map((entry, index) => (
                    <motion.div
                      key={entry._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-800/50 backdrop-blur border border-indigo-500/20 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-indigo-400 mt-1">
                          {entry.type === 'text' && <FiType />}
                          {entry.type === 'file' && <FiFile />}
                          {entry.type === 'image' && <FiImage />}
                        </div>
                        <div className="flex-1">
                          {entry.description && (
                            <p className="text-white font-medium">{entry.description}</p>
                          )}
                          {entry.type === 'text' && (
                            <p className="text-gray-300 mt-1">{entry.content}</p>
                          )}
                          {entry.fileName && (
                            <p className="text-gray-400 text-sm mt-1">{entry.fileName}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-2">
                            <FiClock className="inline mr-1" />
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}