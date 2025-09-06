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
              
              {/* Display images and files inline */}
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
                      ) : file.type === 'application/pdf' ? (
                        <div className="timeline-pdf">
                          <div className="pdf-preview">
                            <div className="pdf-icon">📄</div>
                            <div className="pdf-info">
                              <div className="pdf-name">{file.name}</div>
                              <div className="pdf-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
                              <a 
                                href={`/api/files/${entry._id}?fileIndex=${fileIndex}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pdf-link"
                              >
                                📥 View/Download PDF
                              </a>
                            </div>
                          </div>
                          {/* Embed PDF preview if it's small enough */}
                          {file.size < 5000000 && (
                            <iframe
                              src={`data:${file.type};base64,${file.data}`}
                              className="pdf-iframe"
                              title={file.name}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="timeline-file">
                          <span className="file-icon">📎</span>
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          <a 
                            href={`/api/files/${entry._id}?fileIndex=${fileIndex}`}
                            download={file.name}
                            className="file-download"
                          >
                            📥 Download
                          </a>
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
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #a0a0b0;
          font-size: 0.9rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          margin: 0.5rem 0;
        }
        
        .file-icon, .file-name, .file-size {
          margin-right: 0.5rem;
        }
        
        .file-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-download, .pdf-link {
          color: #00d4ff;
          text-decoration: none;
          padding: 0.25rem 0.5rem;
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 4px;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .file-download:hover, .pdf-link:hover {
          background: rgba(0, 212, 255, 0.1);
          border-color: #00d4ff;
          color: #00ff88;
        }
        
        .timeline-pdf {
          margin: 0.5rem 0;
        }
        
        .pdf-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
        }
        
        .pdf-icon {
          font-size: 2.5rem;
        }
        
        .pdf-info {
          flex: 1;
        }
        
        .pdf-name {
          color: #ffffff;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        
        .pdf-size {
          color: #666;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }
        
        .pdf-iframe {
          width: 100%;
          height: 500px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          margin-top: 1rem;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}