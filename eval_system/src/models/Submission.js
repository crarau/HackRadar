/**
 * Submission Model
 * 
 * Represents a single submission from a startup team.
 * Can be text, file, web URL, or artifact.
 */

export class Submission {
  constructor(data = {}) {
    this._id = data._id;
    this.startupId = data.startupId;
    this.type = data.type; // 'text', 'file', 'web', 'artifact'
    this.submittedAt = data.submittedAt || new Date();
    
    // Content based on type
    this.content = data.content; // Raw text content or extracted content
    this.url = data.url; // For web and some file types
    this.fileName = data.fileName; // For file submissions
    this.fileType = data.fileType; // MIME type
    this.fileSize = data.fileSize; // In bytes
    
    // Processing status
    this.processingStatus = data.processingStatus || 'pending'; // pending, processing, completed, failed
    this.processingError = data.processingError;
    this.processedAt = data.processedAt;
    
    // Extracted metadata
    this.metadata = data.metadata || {};
    
    // Evaluation status
    this.evaluationStatus = data.evaluationStatus || 'pending'; // pending, in_progress, completed, failed
    this.evaluatedAt = data.evaluatedAt;
    this.evaluationResults = data.evaluationResults || [];
  }
  
  /**
   * Set content for text submissions
   */
  setTextContent(text) {
    this.content = text;
    this.type = 'text';
    this.metadata = {
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
      language: 'auto-detect' // Could be enhanced with language detection
    };
  }
  
  /**
   * Set content for file submissions
   */
  setFileContent(fileName, fileType, fileSize, extractedContent) {
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileSize = fileSize;
    this.content = extractedContent;
    this.type = 'file';
    
    this.metadata = {
      originalFileName: fileName,
      mimeType: fileType,
      sizeInBytes: fileSize,
      extractedLength: extractedContent ? extractedContent.length : 0
    };
  }
  
  /**
   * Set content for web submissions
   */
  setWebContent(url, extractedContent, pageTitle, description) {
    this.url = url;
    this.content = extractedContent;
    this.type = 'web';
    
    this.metadata = {
      originalUrl: url,
      pageTitle: pageTitle,
      description: description,
      extractedAt: new Date(),
      contentLength: extractedContent ? extractedContent.length : 0
    };
  }
  
  /**
   * Set content for artifact submissions (repos, complex files, etc.)
   */
  setArtifactContent(url, type, extractedContent, additionalMetadata = {}) {
    this.url = url;
    this.content = extractedContent;
    this.type = 'artifact';
    
    this.metadata = {
      artifactType: type, // 'github_repo', 'pdf_document', 'video', etc.
      sourceUrl: url,
      ...additionalMetadata
    };
  }
  
  /**
   * Mark processing as started
   */
  startProcessing() {
    this.processingStatus = 'processing';
    this.processingError = null;
  }
  
  /**
   * Mark processing as completed
   */
  completeProcessing() {
    this.processingStatus = 'completed';
    this.processedAt = new Date();
  }
  
  /**
   * Mark processing as failed
   */
  failProcessing(error) {
    this.processingStatus = 'failed';
    this.processingError = error.message || error;
  }
  
  /**
   * Add evaluation result
   */
  addEvaluationResult(evaluation) {
    this.evaluationResults.push({
      agent: evaluation.agent,
      score: evaluation.score,
      criteriaScores: evaluation.criteriaScores,
      feedback: evaluation.feedback,
      insights: evaluation.insights,
      confidence: evaluation.confidence,
      evaluatedAt: evaluation.evaluatedAt
    });
    
    if (this.evaluationStatus === 'pending') {
      this.evaluationStatus = 'in_progress';
    }
  }
  
  /**
   * Mark evaluation as completed
   */
  completeEvaluation() {
    this.evaluationStatus = 'completed';
    this.evaluatedAt = new Date();
  }
  
  /**
   * Get content preview (first 200 characters)
   */
  getContentPreview(maxLength = 200) {
    if (!this.content) return 'No content available';
    
    const preview = this.content.substring(0, maxLength);
    return this.content.length > maxLength ? preview + '...' : preview;
  }
  
  /**
   * Get submission summary for display
   */
  getSummary() {
    const summary = {
      id: this._id,
      type: this.type,
      submittedAt: this.submittedAt,
      processingStatus: this.processingStatus,
      evaluationStatus: this.evaluationStatus
    };
    
    switch (this.type) {
      case 'text':
        summary.preview = this.getContentPreview();
        summary.wordCount = this.metadata.wordCount;
        break;
      case 'file':
        summary.fileName = this.fileName;
        summary.fileType = this.fileType;
        summary.fileSize = this.fileSize;
        break;
      case 'web':
        summary.url = this.url;
        summary.pageTitle = this.metadata.pageTitle;
        break;
      case 'artifact':
        summary.url = this.url;
        summary.artifactType = this.metadata.artifactType;
        break;
    }
    
    return summary;
  }
  
  /**
   * Validate submission data
   */
  validate() {
    const errors = [];
    
    if (!this.startupId) errors.push('startupId is required');
    if (!this.type || !['text', 'file', 'web', 'artifact'].includes(this.type)) {
      errors.push('type must be one of: text, file, web, artifact');
    }
    
    switch (this.type) {
      case 'text':
        if (!this.content || this.content.trim().length === 0) {
          errors.push('content is required for text submissions');
        }
        break;
      case 'file':
        if (!this.fileName) errors.push('fileName is required for file submissions');
        if (!this.fileType) errors.push('fileType is required for file submissions');
        break;
      case 'web':
      case 'artifact':
        if (!this.url) errors.push('url is required for web/artifact submissions');
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Convert to MongoDB document
   */
  toDocument() {
    return {
      startupId: this.startupId,
      type: this.type,
      submittedAt: this.submittedAt,
      content: this.content,
      url: this.url,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      processingStatus: this.processingStatus,
      processingError: this.processingError,
      processedAt: this.processedAt,
      metadata: this.metadata,
      evaluationStatus: this.evaluationStatus,
      evaluatedAt: this.evaluatedAt,
      evaluationResults: this.evaluationResults
    };
  }
  
  /**
   * Create from MongoDB document
   */
  static fromDocument(doc) {
    return new Submission(doc);
  }
}