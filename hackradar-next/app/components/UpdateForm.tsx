'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile, FiX, FiLink, FiImage, FiFileText, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface UpdateFormProps {
  projectId: string;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function UpdateForm({ projectId, onSubmit }: UpdateFormProps) {
  const [updateText, setUpdateText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle paste event for screenshots
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Create a file from the blob
            const file = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type });
            setFiles(prev => {
              if (prev.length >= 10) {
                toast.error('Maximum 10 files allowed');
                return prev;
              }
              toast.success('Screenshot pasted from clipboard!');
              return [...prev, file];
            });
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => {
      const newFiles = [...prev, ...acceptedFiles];
      if (newFiles.length > 10) {
        toast.error('Maximum 10 files allowed');
        return prev.slice(0, 10);
      }
      toast.success(`${acceptedFiles.length} file(s) added`);
      return newFiles;
    });
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
    maxFiles: 10,
    maxSize: 10485760, // 10MB per file
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const handleSubmit = async () => {
    // Check if at least one input is provided
    if (!updateText.trim() && !websiteUrl.trim() && files.length === 0) {
      toast.error('Please provide at least one type of input');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      
      // Add text if provided
      if (updateText.trim()) {
        formData.append('text', updateText);
      }
      
      // Add URL if provided
      if (websiteUrl.trim()) {
        formData.append('url', websiteUrl);
      }
      
      // Add files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      
      formData.append('fileCount', files.length.toString());
      formData.append('timestamp', new Date().toISOString());
      
      await onSubmit(formData);
      
      // Clear form after successful submission
      setUpdateText('');
      setWebsiteUrl('');
      setFiles([]);
      toast.success('Update submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="update-form-container">
      {/* Text Input Section */}
      <div className="form-section">
        <label className="form-label">
          <FiFileText className="label-icon" />
          TEXT UPDATE (Optional)
        </label>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          className="text-input"
          placeholder="Describe your progress, achievements, or current work..."
          rows={4}
        />
      </div>

      {/* URL Input Section */}
      <div className="form-section">
        <label className="form-label">
          <FiLink className="label-icon" />
          WEBSITE URL (Optional)
        </label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="url-input"
          placeholder="https://your-project-website.com"
        />
      </div>

      {/* File Upload Section */}
      <div className="form-section">
        <label className="form-label">
          <FiImage className="label-icon" />
          FILES & SCREENSHOTS (Optional - Max 10 files)
        </label>
        
        <div className="upload-hint">
          💡 Tip: Press Ctrl+V (or Cmd+V on Mac) to paste screenshots from clipboard!
        </div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <FiUpload className="upload-icon" />
          <p>Drag & drop files here, or click to select</p>
          <p className="file-types">
            Supports: PDF, Images (PNG, JPG, GIF), DOC, DOCX, TXT, MD
          </p>
        </div>

        {files.length > 0 && (
          <div className="files-list">
            <h4>Uploaded Files ({files.length}/10)</h4>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <FiFile className="file-icon" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button onClick={() => removeFile(index)} className="remove-file">
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="submit-btn"
      >
        {isSubmitting ? (
          <>
            <FiRefreshCw className="spinning" />
            Submitting Update...
          </>
        ) : (
          <>
            <FiUpload />
            Submit Update
          </>
        )}
      </button>

      <style jsx>{`
        .update-form-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #00d4ff;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .label-icon {
          font-size: 1rem;
        }

        .text-input, .url-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .text-input:focus, .url-input:focus {
          outline: none;
          border-color: #00d4ff;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .text-input {
          resize: vertical;
          min-height: 100px;
        }

        .upload-hint {
          padding: 0.75rem;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          color: #00d4ff;
          font-size: 0.9rem;
          text-align: center;
        }

        .dropzone {
          border: 2px dashed rgba(0, 212, 255, 0.5);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(0, 0, 0, 0.2);
        }

        .dropzone.active {
          border-color: #00d4ff;
          background: rgba(0, 212, 255, 0.1);
        }

        .dropzone:hover {
          border-color: #00d4ff;
        }

        .upload-icon {
          font-size: 3rem;
          color: #00d4ff;
          margin-bottom: 1rem;
        }

        .dropzone p {
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .file-types {
          color: #666;
          font-size: 0.9rem;
        }

        .files-list {
          margin-top: 1rem;
        }

        .files-list h4 {
          color: #00d4ff;
          margin-bottom: 0.5rem;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .file-icon {
          color: #00d4ff;
        }

        .file-name {
          flex: 1;
          color: #ffffff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          color: #666;
          font-size: 0.9rem;
        }

        .remove-file {
          background: transparent;
          border: none;
          color: #ff6b6b;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .remove-file:hover {
          color: #ff4444;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(45deg, #00d4ff, #00ff88);
          border: none;
          border-radius: 8px;
          color: #1a1a2e;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}