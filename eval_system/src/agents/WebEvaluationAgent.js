/**
 * Web Evaluation Agent
 * 
 * Specializes in evaluating web-based submissions like websites, landing pages,
 * web applications, and online demos.
 */

import { BaseAgent } from './BaseAgent.js';
import { Evaluation } from '../models/Evaluation.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebEvaluationAgent extends BaseAgent {
  constructor() {
    super(
      'WebEvaluationAgent',
      'Evaluates web-based submissions including websites, web apps, landing pages, and online demos',
      {
        temperature: 0.2,
        maxTokens: 3000,
        model: 'gpt-4'
      }
    );
  }
  
  /**
   * Evaluate web submission
   */
  async evaluate(submission) {
    const startTime = Date.now();
    
    try {
      if (!submission.url) {
        throw new Error('No URL provided for web evaluation');
      }
      
      // Fetch fresh content if needed or use cached content
      let webContent = submission.content;
      let webMetadata = submission.metadata;
      
      if (!webContent || this.isContentStale(submission)) {
        try {
          const freshData = await this.fetchWebContent(submission.url);
          webContent = freshData.content;
          webMetadata = { ...webMetadata, ...freshData.metadata };
        } catch (fetchError) {
          console.warn('Could not fetch fresh content, using cached:', fetchError.message);
          if (!webContent) {
            throw new Error('No web content available and could not fetch fresh content');
          }
        }
      }
      
      const webType = this.categorizeWebsite(submission.url, webContent, webMetadata);
      const systemPrompt = this.createSystemPrompt(this.getWebTypeInstructions(webType));
      
      const messages = [
        {
          role: 'user',
          content: `Please evaluate this ${webType} web submission from a hackathon team:

WEB INFORMATION:
- URL: ${submission.url}
- Page title: ${webMetadata?.pageTitle || 'Unknown'}
- Description: ${webMetadata?.description || 'No description available'}
- Category: ${webType}
- Load time: ${webMetadata?.loadTime || 'Unknown'}

EXTRACTED CONTENT:
${this.truncateContent(webContent, 7000)}

TECHNICAL METADATA:
${JSON.stringify(this.extractTechnicalMetadata(webContent), null, 2)}

Provide a thorough evaluation considering the web presence, user experience, functionality, and technical implementation.`
        }
      ];
      
      const response = await this.makeApiCall(messages, systemPrompt);
      const parsedResponse = this.parseStructuredResponse(response.content);
      
      // Create evaluation object
      const evaluation = new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'web',
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
      
      // Apply web-specific scoring adjustments
      this.applyWebSpecificAdjustments(evaluation, submission, webType, webContent, webMetadata);
      
      // Calculate quality score
      evaluation.calculateQualityScore();
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in WebEvaluationAgent:', error);
      
      // Return error evaluation
      return new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'web',
        overallScore: 0,
        confidence: 0.1,
        feedback: `Error evaluating web submission: ${error.message}`,
        summary: 'Web evaluation failed',
        insights: { strengths: [], weaknesses: ['Web evaluation failed'], opportunities: [], recommendations: ['Please check URL accessibility and try again'] },
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        reviewStatus: 'rejected'
      });
    }
  }
  
  /**
   * Fetch web content and metadata
   */
  async fetchWebContent(url, timeout = 10000) {
    try {
      const startTime = Date.now();
      
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': process.env.USER_AGENT || 'HackRadar-EvalSystem/1.0'
        },
        maxRedirects: 5
      });
      
      const loadTime = Date.now() - startTime;
      const $ = cheerio.load(response.data);
      
      // Extract content
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      
      // Remove script and style content
      $('script, style, noscript').remove();
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();
      
      return {
        content: textContent,
        metadata: {
          pageTitle: title,
          description,
          loadTime,
          statusCode: response.status,
          contentType: response.headers['content-type'],
          lastFetched: new Date(),
          url: response.config.url // Final URL after redirects
        }
      };
    } catch (error) {
      console.error('Failed to fetch web content:', error.message);
      throw new Error(`Could not fetch web content: ${error.message}`);
    }
  }
  
  /**
   * Check if content is stale and needs refresh
   */
  isContentStale(submission) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const lastFetched = submission.metadata?.lastFetched;
    
    if (!lastFetched) return true;
    
    return (Date.now() - new Date(lastFetched).getTime()) > maxAge;
  }
  
  /**
   * Categorize website type for specialized evaluation
   */
  categorizeWebsite(url, content, metadata) {
    const urlLower = url.toLowerCase();
    const contentLower = content.toLowerCase();
    const title = (metadata?.pageTitle || '').toLowerCase();
    
    // GitHub/GitLab repositories
    if (urlLower.includes('github.com') || urlLower.includes('gitlab.com')) {
      return 'code_repository';
    }
    
    // Demo/prototype applications
    if (urlLower.includes('demo') || urlLower.includes('prototype') ||
        contentLower.includes('demo') || contentLower.includes('try it')) {
      return 'demo_application';
    }
    
    // Landing pages
    if (contentLower.includes('sign up') || contentLower.includes('get started') ||
        contentLower.includes('pricing') || contentLower.includes('features')) {
      return 'landing_page';
    }
    
    // Documentation sites
    if (urlLower.includes('docs') || contentLower.includes('documentation') ||
        contentLower.includes('api reference') || contentLower.includes('getting started')) {
      return 'documentation';
    }
    
    // Portfolio/company sites
    if (contentLower.includes('about us') || contentLower.includes('team') ||
        contentLower.includes('portfolio') || contentLower.includes('contact')) {
      return 'company_site';
    }
    
    // Blog/content sites
    if (urlLower.includes('blog') || contentLower.includes('blog') ||
        contentLower.includes('article') || contentLower.includes('post')) {
      return 'blog_content';
    }
    
    return 'generic_website';
  }
  
  /**
   * Get web type specific evaluation instructions
   */
  getWebTypeInstructions(webType) {
    const instructions = {
      demo_application: `
You are evaluating a DEMO APPLICATION or live prototype. Focus on:
- FUNCTIONALITY: Does the application work as intended?
- USER EXPERIENCE: Is it intuitive and easy to use?
- FEATURE COMPLETENESS: Are key features implemented and functional?
- RESPONSIVENESS: Does it work well on different screen sizes?
- PERFORMANCE: Does it load quickly and respond smoothly?
- VALUE DEMONSTRATION: Does it clearly show the product's value?
Consider this is likely an MVP or prototype built during the hackathon.`,

      landing_page: `
You are evaluating a LANDING PAGE or marketing website. Focus on:
- CONVERSION OPTIMIZATION: Clear value proposition and call-to-action
- VISUAL DESIGN: Professional appearance and brand consistency
- CONTENT QUALITY: Compelling copy that explains the product/service
- USER JOURNEY: Logical flow from problem to solution to action
- CREDIBILITY: Trust signals, testimonials, professional appearance
- MOBILE RESPONSIVENESS: Works well on all devices
Consider this is designed to convert visitors into users or customers.`,

      code_repository: `
You are evaluating a CODE REPOSITORY (GitHub/GitLab). Focus on:
- CODE QUALITY: Clean, well-structured, documented code
- PROJECT ORGANIZATION: Clear folder structure and file organization
- DOCUMENTATION: README, installation instructions, usage examples
- COMMIT HISTORY: Regular commits showing development progress
- FEATURES: Implemented functionality and technical complexity
- BEST PRACTICES: Use of version control, testing, CI/CD
Consider this shows the technical implementation of the project.`,

      documentation: `
You are evaluating DOCUMENTATION or technical guides. Focus on:
- COMPLETENESS: Covers all necessary topics thoroughly
- CLARITY: Easy to understand and follow
- ORGANIZATION: Logical structure with clear navigation
- EXAMPLES: Practical examples and code samples
- ACCURACY: Information appears correct and up-to-date
- USABILITY: Easy to search and find specific information
Consider this supports users in understanding and using the product.`,

      company_site: `
You are evaluating a COMPANY or portfolio website. Focus on:
- PROFESSIONALISM: Polished appearance appropriate for business
- CONTENT QUALITY: Clear explanation of company/team and offerings
- TRUST BUILDING: About section, team information, credibility
- CONTACT/ACCESSIBILITY: Easy ways to get in touch
- VISUAL DESIGN: Modern, clean design that reflects brand
- INFORMATION ARCHITECTURE: Easy to navigate and find information
Consider this represents the team or company professionally.`,

      blog_content: `
You are evaluating BLOG or content-focused site. Focus on:
- CONTENT VALUE: Informative, engaging, and valuable content
- WRITING QUALITY: Clear, professional writing style
- RELEVANCE: Content relates to and supports the project
- ENGAGEMENT: Encourages interaction and sharing
- ORGANIZATION: Easy to browse and find relevant content
- FREQUENCY: Regular posting shows ongoing activity
Consider this demonstrates thought leadership and expertise.`,

      generic_website: `
You are evaluating a WEBSITE of unknown specific type. Focus on:
- PURPOSE CLARITY: Clear understanding of what this site is for
- USER EXPERIENCE: Easy to navigate and use
- CONTENT QUALITY: Valuable, relevant, well-presented information
- VISUAL DESIGN: Professional appearance and good design
- FUNCTIONALITY: All features and links work properly
- MOBILE COMPATIBILITY: Responsive design for different devices
Evaluate based on general web standards and user experience principles.`
    };
    
    return instructions[webType] || instructions.generic_website;
  }
  
  /**
   * Extract technical metadata from web content
   */
  extractTechnicalMetadata(content) {
    const metadata = {
      hasJavaScript: content.includes('<script') || content.includes('javascript:'),
      hasCSS: content.includes('<style') || content.includes('stylesheet'),
      hasReact: content.includes('react') || content.includes('React'),
      hasVue: content.includes('vue.js') || content.includes('Vue'),
      hasAngular: content.includes('angular') || content.includes('ng-'),
      hasBootstrap: content.includes('bootstrap'),
      hasjQuery: content.includes('jquery') || content.includes('jQuery'),
      hasAPIs: content.includes('api') || content.includes('fetch') || content.includes('xhr'),
      hasForms: content.includes('<form') || content.includes('input'),
      hasResponsiveDesign: content.includes('viewport') || content.includes('media query'),
      estimatedComplexity: this.estimateWebComplexity(content)
    };
    
    return metadata;
  }
  
  /**
   * Estimate web application complexity
   */
  estimateWebComplexity(content) {
    let complexity = 'basic';
    let score = 0;
    
    // Check for various complexity indicators
    const indicators = [
      { pattern: /api|fetch|ajax|xhr/i, points: 2 },
      { pattern: /react|vue|angular|framework/i, points: 3 },
      { pattern: /database|mongodb|mysql|postgresql/i, points: 3 },
      { pattern: /authentication|login|signup|auth/i, points: 2 },
      { pattern: /websocket|real-time|socket\.io/i, points: 3 },
      { pattern: /payment|stripe|paypal|checkout/i, points: 2 },
      { pattern: /admin|dashboard|analytics/i, points: 2 },
      { pattern: /search|filter|pagination/i, points: 1 },
      { pattern: /upload|file|image/i, points: 1 }
    ];
    
    indicators.forEach(({ pattern, points }) => {
      if (pattern.test(content)) {
        score += points;
      }
    });
    
    if (score >= 8) complexity = 'advanced';
    else if (score >= 4) complexity = 'intermediate';
    
    return complexity;
  }
  
  /**
   * Apply web-specific scoring adjustments
   */
  applyWebSpecificAdjustments(evaluation, submission, webType, content, metadata) {
    const technicalMetadata = this.extractTechnicalMetadata(content);
    
    // Technical complexity bonus
    if (technicalMetadata.estimatedComplexity === 'advanced') {
      evaluation.addInsight('strengths', 'Advanced web application with sophisticated features');
      evaluation.awardFlags.technicalInnovation = true;
      evaluation.criteriaScores.technical = Math.min(100, evaluation.criteriaScores.technical + 10);
    }
    
    // Framework usage
    if (technicalMetadata.hasReact || technicalMetadata.hasVue || technicalMetadata.hasAngular) {
      evaluation.addInsight('strengths', 'Uses modern web development frameworks');
      evaluation.criteriaScores.technical = Math.min(100, evaluation.criteriaScores.technical + 5);
    }
    
    // Responsive design
    if (technicalMetadata.hasResponsiveDesign) {
      evaluation.addInsight('strengths', 'Responsive design for multiple device types');
      evaluation.criteriaScores.presentation = Math.min(100, evaluation.criteriaScores.presentation + 5);
    }
    
    // Load time considerations
    const loadTime = metadata?.loadTime;
    if (loadTime) {
      if (loadTime < 1000) {
        evaluation.addInsight('strengths', 'Fast loading website with good performance');
      } else if (loadTime > 5000) {
        evaluation.addInsight('weaknesses', 'Slow loading time may impact user experience');
        evaluation.criteriaScores.execution = Math.max(0, evaluation.criteriaScores.execution - 10);
      }
    }
    
    // Web type specific adjustments
    switch (webType) {
      case 'demo_application':
        // Demo apps should demonstrate functionality
        evaluation.awardFlags.userExperience = evaluation.criteriaScores.execution >= 80;
        if (technicalMetadata.hasAPIs) {
          evaluation.addInsight('strengths', 'Interactive demo with API integration');
          evaluation.awardFlags.technicalInnovation = true;
        }
        break;
        
      case 'landing_page':
        // Landing pages should convert visitors
        evaluation.awardFlags.presentationExcellence = evaluation.criteriaScores.presentation >= 85;
        evaluation.awardFlags.businessViability = evaluation.criteriaScores.business >= 80;
        break;
        
      case 'code_repository':
        // Repositories should show technical depth
        evaluation.awardFlags.technicalInnovation = evaluation.criteriaScores.technical >= 85;
        break;
        
      case 'documentation':
        // Documentation should be comprehensive
        if (evaluation.criteriaScores.presentation >= 80) {
          evaluation.addInsight('strengths', 'Well-documented project with clear instructions');
        }
        break;
    }
    
    // URL accessibility check
    if (!this.isUrlAccessible(submission.url)) {
      evaluation.addInsight('weaknesses', 'URL may not be publicly accessible');
      evaluation.confidence = Math.min(evaluation.confidence, 0.7);
    }
    
    // Recalculate overall score
    evaluation.calculateOverallScore();
  }
  
  /**
   * Basic URL accessibility check
   */
  isUrlAccessible(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Check for localhost or private IPs
      if (parsedUrl.hostname === 'localhost' || 
          parsedUrl.hostname.startsWith('192.168.') ||
          parsedUrl.hostname.startsWith('10.') ||
          parsedUrl.hostname.startsWith('172.')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}