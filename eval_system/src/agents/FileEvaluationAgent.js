/**
 * File Evaluation Agent
 * 
 * Specializes in evaluating file-based submissions like PDFs, documents,
 * presentations, and other file artifacts.
 */

import { BaseAgent } from './BaseAgent.js';
import { Evaluation } from '../models/Evaluation.js';
import fs from 'fs/promises';
import path from 'path';

export class FileEvaluationAgent extends BaseAgent {
  constructor() {
    super(
      'FileEvaluationAgent',
      'Evaluates file-based submissions including PDFs, presentations, documents, and media files',
      {
        temperature: 0.2,
        maxTokens: 3000,
        model: 'gpt-4'
      }
    );
  }
  
  /**
   * Evaluate file submission
   */
  async evaluate(submission) {
    const startTime = Date.now();
    
    try {
      if (!submission.content || submission.content.trim().length === 0) {
        throw new Error('No extracted file content available for evaluation');
      }
      
      const fileType = this.categorizeFileType(submission.fileType, submission.fileName);
      const systemPrompt = this.createSystemPrompt(this.getFileTypeInstructions(fileType));
      
      const messages = [
        {
          role: 'user',
          content: `Please evaluate this ${fileType} file submission from a hackathon team:

FILE INFORMATION:
- File name: ${submission.fileName}
- File type: ${submission.fileType}
- File size: ${this.formatFileSize(submission.fileSize)}
- Category: ${fileType}

EXTRACTED CONTENT:
${this.truncateContent(submission.content, 7000)}

METADATA:
${JSON.stringify(submission.metadata, null, 2)}

Provide a thorough evaluation considering the file type, content quality, presentation, and technical merit.`
        }
      ];
      
      const response = await this.makeApiCall(messages, systemPrompt);
      const parsedResponse = this.parseStructuredResponse(response.content);
      
      // Create evaluation object
      const evaluation = new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'file',
        overallScore: parsedResponse.overallScore,
        criteriaScores: parsedResponse.criteriaScores,
        confidence: parsedResponse.confidence,
        feedback: parsedResponse.feedback,
        summary: parsedResponse.summary,
        insights: parsedResponse.insights,
        awardFlags: parsedResponse.awardFlags,
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        tokenUsage: {
          input: response.tokenUsage?.prompt_tokens || 0,
          output: response.tokenUsage?.completion_tokens || 0
        },
        modelUsed: response.model
      });
      
      // Apply file-specific scoring adjustments
      this.applyFileSpecificAdjustments(evaluation, submission, fileType);
      
      // Calculate quality score
      evaluation.calculateQualityScore();
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in FileEvaluationAgent:', error);
      
      // Return error evaluation
      return new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'file',
        overallScore: 0,
        confidence: 0.1,
        feedback: `Error evaluating file submission: ${error.message}`,
        summary: 'File evaluation failed',
        insights: { strengths: [], weaknesses: ['File evaluation failed'], opportunities: [], recommendations: ['Please check file format and try again'] },
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        reviewStatus: 'rejected'
      });
    }
  }
  
  /**
   * Categorize file type for specialized evaluation
   */
  categorizeFileType(mimeType, fileName) {
    const extension = path.extname(fileName).toLowerCase();
    
    // PDF documents
    if (mimeType?.includes('pdf') || extension === '.pdf') {
      return 'pdf_document';
    }
    
    // Presentations
    if (mimeType?.includes('presentation') || 
        ['.ppt', '.pptx', '.key'].includes(extension)) {
      return 'presentation';
    }
    
    // Word documents
    if (mimeType?.includes('word') || mimeType?.includes('document') ||
        ['.doc', '.docx', '.rtf'].includes(extension)) {
      return 'document';
    }
    
    // Spreadsheets
    if (mimeType?.includes('sheet') ||
        ['.xls', '.xlsx', '.csv'].includes(extension)) {
      return 'spreadsheet';
    }
    
    // Images
    if (mimeType?.includes('image') ||
        ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'].includes(extension)) {
      return 'image';
    }
    
    // Videos
    if (mimeType?.includes('video') ||
        ['.mp4', '.avi', '.mov', '.wmv', '.flv'].includes(extension)) {
      return 'video';
    }
    
    // Audio
    if (mimeType?.includes('audio') ||
        ['.mp3', '.wav', '.ogg', '.m4a'].includes(extension)) {
      return 'audio';
    }
    
    // Code/Text files
    if (['.js', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml', '.txt', '.md'].includes(extension)) {
      return 'code_text';
    }
    
    return 'generic_file';
  }
  
  /**
   * Get file type specific evaluation instructions
   */
  getFileTypeInstructions(fileType) {
    const instructions = {
      pdf_document: `
You are evaluating a PDF DOCUMENT submission. Focus on:
- CONTENT QUALITY: Is the information comprehensive and valuable?
- STRUCTURE: Is it well-organized with clear sections and flow?
- VISUAL DESIGN: Are there charts, diagrams, or visual elements that enhance understanding?
- PROFESSIONALISM: Does it look polished and presentation-ready?
- COMPLETENESS: Does it cover all necessary aspects of the project?
Consider this may be a business plan, technical specification, pitch deck, or project documentation.`,

      presentation: `
You are evaluating a PRESENTATION submission (PowerPoint, Keynote, etc.). Focus on:
- VISUAL APPEAL: Slide design, layout, use of graphics and images
- NARRATIVE FLOW: Does it tell a compelling story from problem to solution?
- CLARITY: Are key points clear and easy to understand?
- ENGAGEMENT: Would this capture and hold audience attention?
- COMPLETENESS: Does it cover introduction, problem, solution, market, team, etc?
Consider this is likely a pitch presentation for investors or judges.`,

      document: `
You are evaluating a DOCUMENT submission (Word, etc.). Focus on:
- CONTENT DEPTH: Detailed explanation of concepts and ideas
- ORGANIZATION: Clear structure with headings, sections, and logical flow
- WRITING QUALITY: Grammar, clarity, professional tone
- TECHNICAL DETAIL: Appropriate level of technical information
- ACTIONABILITY: Clear next steps and implementation details
Consider this may be project documentation, business plan, or technical specification.`,

      spreadsheet: `
You are evaluating a SPREADSHEET submission. Focus on:
- DATA QUALITY: Relevance and accuracy of data presented
- ANALYSIS: Use of formulas, charts, and analytical tools
- ORGANIZATION: Clear structure with labeled columns and sections  
- INSIGHTS: What business or technical insights does this provide?
- USABILITY: Is it easy to understand and navigate?
Consider this may be financial projections, market analysis, or technical data.`,

      image: `
You are evaluating an IMAGE submission. Focus on:
- RELEVANCE: Does the image support the project effectively?
- QUALITY: Resolution, composition, visual appeal
- INFORMATION VALUE: What does this communicate about the project?
- PROFESSIONALISM: Appropriate for a business/technical context?
- CREATIVITY: Innovative or engaging visual approach?
Consider this may be UI mockups, architecture diagrams, product photos, or infographics.`,

      video: `
You are evaluating a VIDEO submission. Focus on:
- CONTENT QUALITY: Clear explanation of project and value proposition
- PRODUCTION VALUE: Audio quality, video clarity, professional appearance
- ENGAGEMENT: Compelling narrative that holds viewer attention
- DEMONSTRATION: Shows the product/solution in action effectively
- LENGTH: Appropriate duration for the content (not too long/short)
Consider this may be a demo video, pitch presentation, or product showcase.`,

      code_text: `
You are evaluating a CODE/TEXT FILE submission. Focus on:
- CODE QUALITY: Clean, readable, well-structured code (if applicable)
- DOCUMENTATION: Comments, README files, clear explanations
- FUNCTIONALITY: Does the code demonstrate key features or concepts?
- BEST PRACTICES: Following coding standards and conventions
- INNOVATION: Novel approaches or creative solutions
Consider this may be source code, configuration files, or technical documentation.`,

      generic_file: `
You are evaluating a FILE submission of unknown or generic type. Focus on:
- CONTENT VALUE: What information or value does this file provide?
- RELEVANCE: How well does it support the project goals?
- QUALITY: Professional presentation and organization
- COMPLETENESS: Does it appear to be a finished, polished submission?
- CLARITY: Can you understand what this file is trying to communicate?
Evaluate based on the extracted content and available metadata.`
    };
    
    return instructions[fileType] || instructions.generic_file;
  }
  
  /**
   * Apply file-specific scoring adjustments
   */
  applyFileSpecificAdjustments(evaluation, submission, fileType) {
    const fileSize = submission.fileSize || 0;
    const contentLength = submission.content ? submission.content.length : 0;
    
    // File size considerations
    if (fileSize > 50 * 1024 * 1024) { // > 50MB
      evaluation.addInsight('opportunities', 'Consider optimizing file size for better sharing');
    }
    
    if (fileSize < 1024) { // < 1KB
      evaluation.addInsight('weaknesses', 'File appears to be very small, may lack content');
      evaluation.criteriaScores.presentation = Math.max(0, evaluation.criteriaScores.presentation - 20);
    }
    
    // Content extraction quality
    if (contentLength === 0) {
      evaluation.addInsight('weaknesses', 'No readable content could be extracted from file');
      evaluation.confidence = Math.min(evaluation.confidence, 0.3);
    } else if (contentLength < 100) {
      evaluation.addInsight('weaknesses', 'Very limited content extracted from file');
      evaluation.confidence = Math.min(evaluation.confidence, 0.6);
    }
    
    // File type specific adjustments
    switch (fileType) {
      case 'presentation':
        // Presentations should be visual and engaging
        evaluation.awardFlags.presentationExcellence = evaluation.criteriaScores.presentation >= 85;
        if (evaluation.criteriaScores.presentation >= 80) {
          evaluation.addInsight('strengths', 'Well-designed presentation with strong visual appeal');
        }
        break;
        
      case 'pdf_document':
        // PDFs should be comprehensive and professional
        if (contentLength > 2000) {
          evaluation.addInsight('strengths', 'Comprehensive documentation with detailed content');
          evaluation.criteriaScores.business = Math.min(100, evaluation.criteriaScores.business + 5);
        }
        break;
        
      case 'code_text':
        // Code files should demonstrate technical competency
        evaluation.awardFlags.technicalInnovation = evaluation.criteriaScores.technical >= 85;
        if (this.hasAdvancedTechnicalContent(submission.content)) {
          evaluation.addInsight('strengths', 'Demonstrates advanced technical implementation');
          evaluation.awardFlags.technicalInnovation = true;
        }
        break;
        
      case 'image':
        // Images should be visually appealing and informative
        if (evaluation.criteriaScores.presentation >= 80) {
          evaluation.addInsight('strengths', 'High-quality visual content that enhances understanding');
        }
        break;
        
      case 'video':
        // Videos get bonus for engagement and demonstration
        evaluation.criteriaScores.presentation = Math.min(100, evaluation.criteriaScores.presentation + 10);
        evaluation.addInsight('strengths', 'Video format provides excellent demonstration capability');
        break;
    }
    
    // Recalculate overall score
    evaluation.calculateOverallScore();
  }
  
  /**
   * Check for advanced technical content
   */
  hasAdvancedTechnicalContent(content) {
    const advancedPatterns = [
      /machine\s+learning|artificial\s+intelligence|neural\s+network/i,
      /blockchain|cryptocurrency|smart\s+contract/i,
      /microservice|kubernetes|docker|containerization/i,
      /graphql|websocket|real-time|streaming/i,
      /cloud\s+native|serverless|lambda|aws|azure|gcp/i,
      /algorithm|optimization|complexity|big-o/i
    ];
    
    return advancedPatterns.some(pattern => pattern.test(content));
  }
  
  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}