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
  evaluation?: {
    scores: {
      clarity: number;
      problem_value: number;
      feasibility_signal: number;
      originality: number;
      impact_convert: number;
      final_score: number;
    };
    evidence: string[];
    gaps: string[];
    raw_ai_response?: string;
    evaluated_at: string;
  };
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
        {entries.map((entry, index) => {
          const hasScore = entry.evaluation?.scores?.final_score !== undefined;
          const isLast = index === entries.length - 1;
          
          return (
            <div key={entry._id} className={`timeline-item ${hasScore ? 'has-evaluation' : ''}`}>
              <div className="timeline-number">
                {entries.length - index}
              </div>
              {!isLast && <div className="timeline-connector" />}
              <div className="timeline-content">
                <div className="timeline-header">
                  <div className="timeline-date">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                  {hasScore && (
                    <div className="timeline-score">
                      <span className="score-value">{entry.evaluation?.scores?.final_score}/100</span>
                    </div>
                  )}
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
              
              {/* Display evaluation feedback if available */}
              {entry.evaluation && (
                <div className="evaluation-feedback">
                  {entry.evaluation.evidence?.length > 0 && (
                    <div className="feedback-section current-progress">
                      <strong>🚀 Current Progress:</strong>
                      <ul>
                        {entry.evaluation.evidence.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Show detailed score breakdown */}
                  <div className="score-breakdown">
                    <strong>📊 Score Breakdown:</strong>
                    <div className="score-grid">
                      <div>Clarity: <span>{entry.evaluation.scores.clarity}/15</span></div>
                      <div>Problem Value: <span>{entry.evaluation.scores.problem_value}/20</span></div>
                      <div>Feasibility: <span>{entry.evaluation.scores.feasibility_signal}/15</span></div>
                      <div>Originality: <span>{entry.evaluation.scores.originality}/15</span></div>
                      <div>Impact: <span>{entry.evaluation.scores.impact_convert}/20</span></div>
                      <div>Submission Readiness: <span>{entry.evaluation.scores.submission_readiness || 0}/15</span></div>
                    </div>
                  </div>
                  
                  {/* Separate Areas for Improvement Section */}
                  {entry.evaluation.gaps?.length > 0 && (
                    <div className="improvement-recommendations">
                      <h4>🎯 How to Improve Your Score</h4>
                      <div className="improvement-list">
                        {entry.evaluation.gaps.map((gap, i) => (
                          <div key={i} className="improvement-item">
                            <span className="improvement-icon">→</span>
                            <span>{gap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show AI explanation if available */}
                  {entry.evaluation.raw_ai_response && (() => {
                    try {
                      const aiResponse = JSON.parse(entry.evaluation.raw_ai_response);
                      const explanation = aiResponse.explanation || 
                        (entry.evaluation.raw_ai_response.includes('Explanation:') ? 
                          entry.evaluation.raw_ai_response.split('Explanation:')[1]?.trim() : null);
                      
                      if (explanation) {
                        return (
                          <div className="ai-explanation">
                            <strong>🤖 AI Analysis:</strong>
                            <div className="explanation-text">{explanation}</div>
                          </div>
                        );
                      }
                    } catch {
                      // If parsing fails, show raw explanation if it contains "Explanation:"
                      if (entry.evaluation.raw_ai_response.includes('Explanation:')) {
                        const explanation = entry.evaluation.raw_ai_response.split('Explanation:')[1]?.trim();
                        return (
                          <div className="ai-explanation">
                            <strong>🤖 AI Analysis:</strong>
                            <div className="explanation-text">{explanation}</div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          </div>
          );
        })}
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
          gap: 0;
          position: relative;
        }
        
        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          transition: all 0.3s ease;
          margin-bottom: 2rem;
          position: relative;
        }
        
        .timeline-item.has-evaluation {
          background: rgba(0, 255, 136, 0.05);
          border-color: rgba(0, 255, 136, 0.3);
        }
        
        .timeline-item:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: #00d4ff;
          transform: translateX(5px);
        }
        
        .timeline-number {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00d4ff, #00ff88);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #1a1a2e;
          flex-shrink: 0;
          font-size: 1.2rem;
          z-index: 2;
          position: relative;
        }
        
        .timeline-connector {
          position: absolute;
          left: 1.5rem;
          top: 3.5rem;
          transform: translateX(25px);
          width: 3px;
          height: calc(100% + 0.5rem);
          background: linear-gradient(180deg, #00d4ff, rgba(0, 212, 255, 0.3));
          z-index: 1;
        }
        
        .timeline-content {
          flex: 1;
        }
        
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .timeline-date {
          color: #00d4ff;
          font-size: 0.9rem;
        }
        
        .timeline-score {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .score-value {
          background: linear-gradient(45deg, #00d4ff, #00ff88);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: bold;
          font-size: 1.1rem;
        }
        
        .score-delta {
          padding: 0.25rem 0.5rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
        }
        
        .score-delta.up {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.3);
        }
        
        .score-delta.down {
          background: rgba(255, 77, 77, 0.2);
          color: #ff4d4d;
          border: 1px solid rgba(255, 77, 77, 0.3);
        }
        
        .score-update {
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 255, 136, 0.1) 100%);
          border-color: #00ff88;
        }
        
        .evaluation-feedback {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        
        .feedback-section {
          margin-bottom: 0.75rem;
        }
        
        .feedback-section:last-child {
          margin-bottom: 0;
        }
        
        .feedback-section strong {
          color: #00d4ff;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .current-progress strong {
          color: #00ff88;
        }
        
        .feedback-section ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #e0e0e0;
        }
        
        .feedback-section li {
          margin-bottom: 0.25rem;
        }
        
        .score-breakdown {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
        }
        
        .score-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          margin-top: 0.5rem;
          color: #e0e0e0;
          font-size: 0.9rem;
        }
        
        .score-grid > div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .score-grid span {
          color: #00d4ff;
          font-weight: bold;
        }
        
        .ai-explanation {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 255, 136, 0.2);
        }
        
        .ai-explanation strong {
          color: #00ff88;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .explanation-text {
          color: #e0e0e0;
          font-style: italic;
          line-height: 1.5;
          background: rgba(0, 255, 136, 0.05);
          padding: 0.75rem;
          border-radius: 6px;
          border-left: 3px solid #00ff88;
        }
        
        .improvement-recommendations {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255, 165, 0, 0.05);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 8px;
        }
        
        .improvement-recommendations h4 {
          color: #ffa500;
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: bold;
        }
        
        .improvement-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .improvement-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 165, 0, 0.1);
          border-radius: 6px;
          border-left: 3px solid #ffa500;
        }
        
        .improvement-icon {
          color: #ffa500;
          font-weight: bold;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        
        .improvement-item span:last-child {
          color: #e0e0e0;
          line-height: 1.4;
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