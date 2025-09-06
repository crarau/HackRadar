const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class LinkedInPoster {
  constructor() {
    this.browser = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, 'linkedin-session');
  }

  async init(headless = false) {
    // Use persistent user data directory to maintain session
    this.browser = await puppeteer.launch({
      headless: headless,
      userDataDir: this.userDataDir,  // This stores cookies, localStorage, etc.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async checkSession() {
    console.log('🔍 Checking existing session...');
    await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' });
    
    const url = this.page.url();
    const isLoggedIn = !url.includes('/login') && !url.includes('/checkpoint');
    
    if (isLoggedIn) {
      console.log('✅ Using existing session - already logged in!');
      return true;
    }
    
    console.log('❌ No valid session found - login required');
    return false;
  }

  async login(email = null, password = null) {
    // First check if we're already logged in with saved session
    const hasSession = await this.checkSession();
    if (hasSession) {
      return;
    }

    // If no saved session, we need credentials
    if (!email || !password) {
      console.log('📝 First-time login required.');
      console.log('Please enter your LinkedIn credentials (they will be used once to create a persistent session)');
      
      // Interactive prompt for credentials
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      email = await new Promise(resolve => {
        readline.question('Email: ', resolve);
      });
      
      password = await new Promise(resolve => {
        readline.question('Password: ', resolve);
      });
      
      readline.close();
    }

    console.log('📱 Logging in to LinkedIn...');
    await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    
    // Type email
    await this.page.type('#username', email, { delay: 100 });
    
    // Type password
    await this.page.type('#password', password, { delay: 100 });
    
    // Click sign in button
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Check if we need to handle 2FA
    const url = this.page.url();
    if (url.includes('checkpoint') || url.includes('challenge')) {
      console.log('⚠️  2FA detected. Please complete verification in the browser window.');
      console.log('Press Enter when done...');
      await new Promise(resolve => process.stdin.once('data', resolve));
    }
    
    console.log('✅ Logged in successfully!');
    console.log('💾 Session saved - you won\'t need to login again!');
  }

  async createPost(content, imagePath = null) {
    console.log('📝 Creating new post...');
    
    // Navigate to home feed
    await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' });
    
    // Click on "Start a post" button
    const postButtonSelectors = [
      'button[class*="share-box-feed-entry__trigger"]',
      'button.artdeco-button.artdeco-button--muted',
      'div.share-box-feed-entry__top-bar button',
      'button[aria-label*="post"]'
    ];
    
    let clicked = false;
    for (const selector of postButtonSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        clicked = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!clicked) {
      throw new Error('Could not find post button');
    }
    
    // Wait for modal to open
    await this.page.waitForSelector('.ql-editor', { timeout: 10000 });
    
    // Type the content
    await this.page.type('.ql-editor', content, { delay: 10 });
    
    // Add image if provided
    if (imagePath) {
      const fileInput = await this.page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
        console.log('🖼️  Image uploaded');
        await this.page.waitForTimeout(2000); // Wait for upload
      }
    }
    
    // Wait a bit for content to be ready
    await this.page.waitForTimeout(1000);
    
    // Click Post button
    const postSubmitSelectors = [
      'button[class*="share-actions__primary-action"]',
      'button[class*="artdeco-button--primary"]',
      'button:has-text("Post")'
    ];
    
    for (const selector of postSubmitSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (text && text.includes('Post')) {
            await button.click();
            console.log('✅ Post published!');
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    await this.page.waitForTimeout(3000);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Post scheduler
class PostScheduler {
  constructor(poster) {
    this.poster = poster;
    this.posts = [];
  }

  async loadPosts(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    this.posts = JSON.parse(data);
    console.log(`📋 Loaded ${this.posts.length} posts`);
  }

  async schedulePost(post, delayMinutes = 0) {
    if (delayMinutes > 0) {
      console.log(`⏰ Waiting ${delayMinutes} minutes before posting...`);
      await new Promise(resolve => setTimeout(resolve, delayMinutes * 60 * 1000));
    }
    
    await this.poster.createPost(post.content, post.image);
    console.log(`✅ Posted: "${post.title}"`);
  }

  async runSchedule() {
    for (const post of this.posts) {
      if (post.scheduled && new Date(post.scheduled) > new Date()) {
        const delay = (new Date(post.scheduled) - new Date()) / 1000 / 60;
        await this.schedulePost(post, delay);
      } else if (!post.posted) {
        await this.schedulePost(post, 0);
        post.posted = true;
        post.postedAt = new Date().toISOString();
      }
    }
  }
}

// Main execution
async function main() {
  const poster = new LinkedInPoster();
  
  try {
    // Initialize browser (set to false to see the browser)
    await poster.init(false);
    
    // Login (will use saved session if available, otherwise prompt for credentials)
    await poster.login();
    
    // Create scheduler
    const scheduler = new PostScheduler(poster);
    
    // Load posts
    await scheduler.loadPosts(path.join(__dirname, 'posts.json'));
    
    // Run scheduled posts
    await scheduler.runSchedule();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await poster.close();
  }
}

// Export for use as module
module.exports = { LinkedInPoster, PostScheduler };

// Run if called directly
if (require.main === module) {
  main();
}