import React from 'react';

interface TimelineEntry {
  _id: string;
  createdAt: string;
  description?: string;
  content?: string;
  type?: string;
  text?: string;
  url?: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    data: string;
    isImage: boolean;
  }>;
}

interface TimelineProps {
  entries: TimelineEntry[];
  teamName: string;
}

export default function Timeline({ entries, teamName }: TimelineProps) {
  return (
    <div className="timeline-container">
      <h2 className="timeline-header">Project Timeline</h2>
      <div className="timeline-team">
        <strong>Team:</strong> {teamName}
      </div>
      <div className="timeline-entries">
        {entries.map((entry, index) => (
          <div key={entry._id} className="timeline-item">
            <div className="timeline-number">
              {index + 1}
            </div>
            <div className="timeline-content">
              <div className="timeline-date">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              
              {/* Display text if present */}
              {entry.text && (
                <div className="timeline-text">
                  {entry.text}
                </div>
              )}
              
              {/* Display URL as clickable link */}
              {entry.url && (
                <div className="timeline-url">
                  <a href={entry.url} target="_blank" rel="noopener noreferrer">
                    🔗 {entry.url}
                  </a>
                </div>
              )}
              
              {/* Display images inline */}
              {entry.files && entry.files.length > 0 && (
                <div className="timeline-files">
                  {entry.files.map((file, fileIndex) => (
                    <div key={fileIndex}>
                      {file.isImage ? (
                        <div className="timeline-image">
                          <img 
                            src={`data:${file.type};base64,${file.data}`} 
                            alt={file.name}
                          />
                          <div className="image-caption">{file.name}</div>
                        </div>
                      ) : (
                        <div className="timeline-file">
                          📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Fallback to old display */}
              {!entry.text && !entry.url && (!entry.files || entry.files.length === 0) && (
                <div className="timeline-text">
                  {entry.description || entry.content || `${entry.type} submission`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .timeline-container {
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 12px;
          padding: 2rem;
          margin-top: 2rem;
        }
        
        .timeline-header {
          font-size: 1.5rem;
          font-weight: bold;
          color: #00d4ff;
          margin-bottom: 1.5rem;
        }
        
        .timeline-team {
          color: #00d4ff;
          margin-bottom: 1rem;
        }
        
        .timeline-entries {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .timeline-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .timeline-item:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: #00d4ff;
          transform: translateX(5px);
        }
        
        .timeline-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00d4ff, #00ff88);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #1a1a2e;
          flex-shrink: 0;
        }
        
        .timeline-content {
          flex: 1;
        }
        
        .timeline-date {
          color: #00d4ff;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }
        
        .timeline-text {
          color: #ffffff;
          word-break: break-word;
          margin-bottom: 0.5rem;
        }
        
        .timeline-url {
          margin: 0.5rem 0;
        }
        
        .timeline-url a {
          color: #00d4ff;
          text-decoration: none;
          word-break: break-all;
          transition: color 0.3s ease;
        }
        
        .timeline-url a:hover {
          color: #00ff88;
          text-decoration: underline;
        }
        
        .timeline-files {
          margin-top: 0.5rem;
        }
        
        .timeline-image {
          margin: 0.5rem 0;
        }
        
        .timeline-image img {
          max-width: 100%;
          max-height: 400px;
          border-radius: 8px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          display: block;
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        
        .timeline-image img:hover {
          transform: scale(1.02);
          border-color: #00d4ff;
        }
        
        .image-caption {
          color: #666;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }
        
        .timeline-file {
          color: #a0a0b0;
          font-size: 0.9rem;
          padding: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}