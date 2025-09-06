# Lessons Learned - HackRadar Development Session

## Date: September 6, 2025

## Critical Development Guidelines

### 1. CSS and Styling Best Practices

#### ❌ NEVER DO THIS:
```jsx
// WRONG - Inline styles are messy and hard to maintain
<div style={{ marginBottom: '2rem', color: '#00d4ff', fontSize: '0.9rem' }}>
  Content
</div>

// WRONG - Duplicate className attributes
<div className="submission-section" className="mt-8">
```

#### ✅ ALWAYS DO THIS:
```jsx
// RIGHT - Use Tailwind CSS classes
<div className="mb-8 text-cyan-400 text-sm">
  Content
</div>

// RIGHT - Combine classes in a single className
<div className="submission-section mt-8">
```

### 2. MongoDB Integration Patterns

#### User-Project Association
- **Lesson**: Always associate projects with user emails, not just team names
- **Why**: Users need to see their projects when they log in
- **Implementation**:
```javascript
// Check for user's projects on login
const userProject = projects.find(p => p.email === userData.email);
```

#### Connection String Security
- **Store credentials in `.env.local`**, never in code
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/database`
- **Always include**: `?retryWrites=true&w=majority`

### 3. React State Management

#### localStorage Persistence Pattern
```javascript
// Save to localStorage when data changes
localStorage.setItem('hackradar_user', JSON.stringify(userData));
localStorage.setItem('hackradar_project', JSON.stringify(projectData));

// Load on component mount
React.useEffect(() => {
  const savedUser = localStorage.getItem('hackradar_user');
  if (savedUser) {
    const userData = JSON.parse(savedUser);
    setUser(userData);
    // Load user's projects from database
  }
}, []);

// Clear on logout
localStorage.removeItem('hackradar_user');
localStorage.removeItem('hackradar_project');
```

### 4. UI/UX Flow Patterns

#### Progressive Disclosure
- **Step 1**: Ask for minimal information (team name only)
- **Step 2**: Once team exists, show update form
- **Step 3**: Display timeline and evaluations as they accumulate

#### Edit-in-Place Pattern
```javascript
// Provide inline editing with clear visual feedback
const [isEditing, setIsEditing] = useState(false);
const [editedValue, setEditedValue] = useState('');

// Show pencil icon on hover
// Switch to input field when clicked
// Provide save/cancel buttons
// Handle Enter to save, Escape to cancel
```

### 5. API Design Patterns

#### RESTful Routes Structure
```
/api/projects    - GET (list), POST (create)
/api/timeline    - GET (list by projectId), POST (add entry)
/api/assess      - POST (generate assessment)
```

#### FormData for Mixed Content
```javascript
// When sending files or mixed content
const formData = new FormData();
formData.append('projectId', project._id);
formData.append('type', 'text');
formData.append('content', updateText);
```

### 6. Error Handling Patterns

#### Always Check for Existing Data
```javascript
// Before creating, check if exists
const existing = projects.find(p => p.teamName === teamName);
if (existing) {
  // Use existing
} else {
  // Create new
}
```

### 7. Git Commit Practices

#### Always Backup Before Major Changes
```bash
# Before converting to Tailwind or major refactoring
git add -A
git commit -m "Backup before converting to Tailwind CSS"
git push origin main
```

### 8. CSS Framework Consistency

#### Pick One and Stick With It
- If using Tailwind, use it everywhere
- Don't mix inline styles with utility classes
- Comment out or remove conflicting CSS rules from stylesheets

### 9. Component State Initialization

#### Handle All States Properly
```javascript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
```

### 10. Debugging MongoDB Issues

#### Check These When Data Doesn't Load:
1. Is the connection string correct in `.env.local`?
2. Is the user's email being used to filter projects?
3. Is localStorage being checked on mount?
4. Are API routes returning the expected data?
5. Is the MongoDB query using the correct field names?

### 11. Tailwind CSS Color Palette

#### Use Consistent Colors:
- Primary: `text-cyan-400`, `border-cyan-400`, `bg-cyan-400`
- Success: `text-green-400`, `bg-green-400`
- Error: `text-red-400`, `bg-red-400`
- Warning: `text-orange-400`, `bg-orange-400`
- Text: `text-white`, `text-gray-400`, `text-gray-500`
- Background: `bg-black/30` (30% opacity black)

### 12. React Component Patterns

#### Conditional Rendering
```javascript
// Clean conditional rendering
{!project ? (
  // Show team creation form
) : (
  // Show update form
)}
```

### 13. Toast Notifications

#### Provide Clear Feedback
```javascript
toast.success(`Welcome back, ${userData.name}! Found your team: ${userProject.teamName}`);
toast.error('Please enter your team name');
```

### 14. Environment Variables

#### Next.js Specific:
- Public variables must start with `NEXT_PUBLIC_`
- Server-only variables don't need prefix
- Always restart dev server after changing `.env.local`

### 15. CSS Class Organization

#### Order of Tailwind Classes (for consistency):
1. Layout (flex, grid)
2. Positioning (relative, absolute)
3. Sizing (w-, h-)
4. Spacing (m-, p-)
5. Background (bg-)
6. Border (border, rounded)
7. Text (text-, font-)
8. Effects (shadow, opacity)
9. Transitions (transition)
10. States (hover:, focus:)

### 16. Common Pitfalls to Avoid

1. **Don't forget to stringify/parse localStorage**
2. **Don't use style props when Tailwind classes exist**
3. **Don't duplicate className attributes**
4. **Don't forget to handle loading states**
5. **Don't hardcode values that should be in environment variables**
6. **Don't mix CSS approaches (inline, CSS files, Tailwind)**
7. **Don't forget to associate data with user emails**

### 17. Project Structure Best Practices

```
/app
  /api          - API routes
  /components   - Reusable components
  page.tsx      - Main page
  layout.tsx    - Layout wrapper
  globals.css   - Global styles (Tailwind imports)
  
/lib
  mongodb.ts    - Database connection
  models.ts     - Data models
  
/public         - Static assets
```

### 18. Quick Debugging Commands

```bash
# Check MongoDB connection
curl -X GET http://localhost:7843/api/projects

# Check specific user's projects
curl -X GET "http://localhost:7843/api/projects" | jq '.[] | select(.email == "user@email.com")'

# Test timeline API
curl -X GET "http://localhost:7843/api/timeline?projectId=PROJECT_ID"
```

### 19. Development Workflow

1. **Always test locally first**
2. **Commit working code before major changes**
3. **Use descriptive commit messages**
4. **Push to remote frequently**
5. **Test on different screen sizes**
6. **Check browser console for errors**

### 20. Performance Considerations

- Use `React.useCallback` for event handlers
- Use `React.useMemo` for expensive computations
- Lazy load components when possible
- Optimize images before uploading
- Use proper MongoDB indexes

## Summary

The most important lesson: **Consistency is key**. Whether it's styling approach, state management, or API design, pick a pattern and stick with it throughout the project. This makes the code more maintainable and easier to debug.

## Remember for Next Time

1. Start with Tailwind from the beginning if that's the chosen framework
2. Set up user authentication and data association properly from the start
3. Plan the data flow before implementing features
4. Test with real user accounts early in development
5. Keep the UI simple and progressive - don't show everything at once