# MongoDB Atlas Setup Guide (FREE)

## Quick Setup - 5 Minutes

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google (easiest) or create account
3. **No credit card required** for free tier

### 2. Create Your First Cluster
1. Choose **FREE Shared Cluster** (M0 Sandbox)
2. Select cloud provider: **AWS**
3. Select region: **us-east-1** (or closest to you)
4. Cluster name: `hackradar-cluster`
5. Click **Create Cluster** (takes 1-3 minutes)

### 3. Set Database Access
1. Go to **Database Access** in left menu
2. Click **Add New Database User**
3. Username: `hackradar-admin`
4. Password: Click **Autogenerate Secure Password**
5. **SAVE THIS PASSWORD!**
6. User Privileges: **Atlas Admin**
7. Click **Add User**

### 4. Set Network Access
1. Go to **Network Access** in left menu
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for hackathon)
   - For production, use specific IPs
4. Click **Confirm**

### 5. Get Connection String
1. Go to **Database** in left menu
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string:
   ```
   mongodb+srv://hackradar-admin:<password>@hackradar-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your saved password
7. Add database name: `/hackradar?` before the query params:
   ```
   mongodb+srv://hackradar-admin:YOUR_PASSWORD@hackradar-cluster.xxxxx.mongodb.net/hackradar?retryWrites=true&w=majority
   ```

### 6. Update Your .env.local
```env
MONGODB_URI=mongodb+srv://hackradar-admin:YOUR_PASSWORD@hackradar-cluster.xxxxx.mongodb.net/hackradar?retryWrites=true&w=majority
```

## Test Your Connection

Run locally:
```bash
npm run dev
```

Visit http://localhost:3000 and try submitting a form.

## Monitoring

1. Go to **Database** → **Browse Collections**
2. You'll see your submissions appear here in real-time

## Free Tier Limits
- **512 MB storage** (enough for ~10,000 submissions)
- **Shared RAM**
- **100 connections max**
- Perfect for hackathon!

## Troubleshooting

### Connection Error?
- Check password is correct (no special chars that need encoding)
- Verify IP whitelist includes your current IP
- Make sure cluster is deployed (green status)

### Slow Queries?
- Free tier has shared resources
- Normal for 1-2 second delays
- Will be faster with paid tier

## Need Help?
- MongoDB Atlas Support Chat (bottom right of dashboard)
- Check connection string format carefully
- Ensure database name is included in URI