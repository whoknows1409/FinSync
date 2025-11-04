# 🔧 Render Deployment Troubleshooting Guide

Common issues and solutions when deploying FinSync to Render.

---

## 🚨 Build & Deployment Errors

### ❌ Build Failed: Module Not Found

**Symptom**: Build fails with "Cannot find module 'xyz'"

**Solution**:
1. Check if module is in `package.json` dependencies
2. Add missing dependency:
   ```bash
   cd backend  # or frontend
   npm install missing-package --save
   git add package.json package-lock.json
   git commit -m "Add missing dependency"
   git push origin master
   ```

---

### ❌ Build Command Failed

**Symptom**: "Build command exited with code 1"

**Solutions**:
1. **Check Node Version**:
   - Render uses Node 18+ by default
   - Add `.node-version` file if needed:
     ```
     18
     ```

2. **Verify Build Command**:
   - Backend: `npm install`
   - Frontend: `npm install && npm run build`

3. **Check Build Logs**:
   - Open Render dashboard
   - Click on failed deployment
   - Read error messages

---

### ❌ Start Command Failed

**Symptom**: "Start command exited with code 1"

**Solutions**:
1. **Verify Start Command**:
   - Backend: `npm start` or `node server.js`
   - Frontend: `npm start`

2. **Check package.json**:
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

3. **Port Configuration**:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```

---

## 🗄️ Database Connection Issues

### ❌ MongoDB Connection Failed

**Symptom**: "MongoServerError: bad auth" or "Connection timeout"

**Solutions**:

1. **Check MongoDB URI**:
   ```
   ❌ Wrong: mongodb+srv://user:p@ssword@cluster.mongodb.net/db
   ✅ Right: mongodb+srv://user:p%40ssword@cluster.mongodb.net/db
   ```
   URL-encode special characters:
   - `@` → `%40`
   - `#` → `%23`
   - `%` → `%25`

2. **Verify Network Access**:
   - Login to MongoDB Atlas
   - Network Access → Add IP Address
   - Use `0.0.0.0/0` (allow from anywhere)

3. **Check Database User**:
   - Database Access → Ensure user exists
   - Verify username and password
   - Check user has proper privileges

4. **Test Connection Locally**:
   ```bash
   node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_URI').then(() => console.log('Connected!')).catch(e => console.error(e));"
   ```

---

### ❌ Database Connection Timeout

**Symptom**: "Server selection timed out after 30000 ms"

**Solutions**:
1. Check MongoDB Atlas cluster is running
2. Verify IP whitelist includes `0.0.0.0/0`
3. Try different MongoDB Atlas region
4. Check Render service region (should be close to DB)

---

## 🌐 CORS Issues

### ❌ CORS Policy Error

**Symptom**: "Access to fetch blocked by CORS policy"

**Solution 1 - Update Backend CORS**:
```javascript
// backend/server.js
const cors = require('cors');

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'https://finsync-frontend.onrender.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Solution 2 - Environment Variable**:
1. Go to backend service in Render
2. Environment tab
3. Ensure `FRONTEND_URL` is set correctly
4. Save and redeploy

---

## 🔐 Environment Variable Issues

### ❌ Environment Variables Not Working

**Symptom**: App behaves like env vars are undefined

**Solutions**:

1. **Check Variable Names**:
   - Backend: Any name (e.g., `MONGODB_URI`)
   - Frontend: Must start with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_API_URL`)

2. **Verify in Render**:
   - Go to service in Render
   - Click "Environment" tab
   - Check all variables are present
   - Check for typos

3. **Restart Service**:
   - After changing env vars, click "Manual Deploy" → "Clear build cache & deploy"

4. **Frontend Variables**:
   ```javascript
   // ❌ Won't work on client-side
   const apiUrl = process.env.API_URL;
   
   // ✅ Works on client-side
   const apiUrl = process.env.NEXT_PUBLIC_API_URL;
   ```

---

## 🐌 Performance Issues

### ❌ 502 Bad Gateway

**Symptom**: "502 Bad Gateway" error on first request

**Cause**: Free tier services sleep after 15 minutes

**Solutions**:
1. **Wait 30-60 seconds** - Service is waking up
2. Refresh the page
3. Upgrade to paid tier ($7/month) to prevent sleeping
4. Accept this behavior on free tier

---

### ❌ Slow Response Times

**Symptom**: API calls take 5+ seconds

**Solutions**:
1. **Cold Start**: First request after sleep is slow
2. **Check Logs**: Look for slow queries or errors
3. **Database**: Optimize MongoDB queries
4. **Caching**: Implement caching for frequent requests
5. **Region**: Use same region for frontend, backend, and database

---

## 🔑 Authentication Issues

### ❌ JWT Token Invalid

**Symptom**: "JsonWebTokenError: invalid token"

**Solutions**:
1. **Check JWT_SECRET**:
   - Verify it's set in Render environment variables
   - Must be the same value that generated the token

2. **Token Expiration**:
   ```javascript
   // Check JWT_EXPIRE setting
   JWT_EXPIRE=7d
   ```

3. **Clear Browser Storage**:
   - Clear localStorage/sessionStorage
   - Try login again

---

### ❌ Google OAuth Not Working

**Symptom**: Google OAuth redirect fails

**Solutions**:
1. **Update Google Console**:
   - Add Render URLs to authorized redirect URIs
   - Format: `https://finsync-backend.onrender.com/api/auth/google/callback`

2. **Check Environment Variables**:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=https://finsync-backend.onrender.com/api/auth/google/callback
   FRONTEND_URL=https://finsync-frontend.onrender.com
   ```

---

## 📦 Static Files & Assets

### ❌ Images Not Loading

**Symptom**: Images return 404 or don't display

**Solutions**:
1. **Check Image Paths**:
   ```jsx
   // ❌ Wrong
   <img src="/images/logo.png" />
   
   // ✅ Right (Next.js)
   <Image src="/logo.png" alt="Logo" width={100} height={100} />
   ```

2. **Verify Public Folder**:
   - Images should be in `frontend/public/`
   - Access as `/image.png`, not `/public/image.png`

3. **Use Cloudinary**:
   - Upload images to Cloudinary
   - Use Cloudinary URLs

---

## 🔄 Deployment Issues

### ❌ Auto-Deploy Not Working

**Symptom**: Pushing to GitHub doesn't trigger deployment

**Solutions**:
1. **Check Branch**:
   - Render watches specific branch (usually `master` or `main`)
   - Ensure you're pushing to correct branch

2. **Check Repository Connection**:
   - Go to service settings in Render
   - Verify GitHub connection is active

3. **Manual Deploy**:
   - Click "Manual Deploy" → "Deploy latest commit"

---

### ❌ Build Cache Issues

**Symptom**: Old code still running after push

**Solutions**:
1. **Clear Build Cache**:
   - Manual Deploy → "Clear build cache & deploy"

2. **Check Deployment Logs**:
   - Verify new commit hash is being deployed

---

## 🔍 Debugging Tips

### Check Render Logs

1. **Access Logs**:
   - Go to service in Render dashboard
   - Click "Logs" tab
   - View real-time logs

2. **Filter Logs**:
   ```
   Search for:
   - "Error"
   - "Failed"
   - "MongoDB"
   - Your specific error message
   ```

### Test Locally First

Before deploying, test locally with production-like settings:

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Frontend
cd frontend
npm run build
npm start
```

### Use Health Check Endpoints

Add health check to your backend:

```javascript
// backend/server.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

Test: `curl https://finsync-backend.onrender.com/api/health`

---

## 💰 Free Tier Limitations

### Understanding Free Tier

**Limits**:
- ✅ 750 hours/month per service
- ✅ Free SSL certificates
- ✅ Auto-deploy from GitHub
- ❌ Services sleep after 15 min inactivity
- ❌ Shared CPU/memory
- ❌ Limited bandwidth

**Workarounds**:
1. Accept 30-60s cold start
2. Upgrade to paid tier ($7/month)
3. Use for testing/development only

---

## 🆘 Still Having Issues?

### 1. Check Official Docs
- [Render Docs](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)

### 2. Community Support
- Render Community Forum
- Stack Overflow
- GitHub Issues

### 3. Contact Support
- Render Dashboard → Help
- MongoDB Atlas Support
- Create GitHub issue in your repo

---

## 📋 Debugging Checklist

When something goes wrong:

- [ ] Check Render logs for errors
- [ ] Verify all environment variables are set
- [ ] Test database connection
- [ ] Check CORS configuration
- [ ] Verify build and start commands
- [ ] Test locally with production settings
- [ ] Clear build cache and redeploy
- [ ] Check GitHub repository is up to date
- [ ] Verify branch name matches Render settings
- [ ] Test API endpoints with curl/Postman
- [ ] Check browser console for errors
- [ ] Verify MongoDB Atlas IP whitelist
- [ ] Test without cache (incognito mode)

---

## 🎯 Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| 502 Gateway | Wait 60s (service waking) |
| Build fails | Check package.json, clear cache |
| DB connection | Verify URI, check IP whitelist |
| CORS errors | Add frontend URL to backend CORS |
| Env vars not working | Check spelling, restart service |
| Images not loading | Check paths, use /public/ folder |
| Auto-deploy broken | Check branch, manual deploy |
| Slow performance | Cold start (free tier) |
| Auth issues | Check secrets, clear browser cache |

---

**Remember**: Most issues are resolved by:
1. Checking logs
2. Verifying environment variables
3. Clearing cache and redeploying

Good luck! 🚀
