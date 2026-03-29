# Fix npm Installation Issues - Welcome Page

## Problem
When running `npm install` in `frontend/welcome/`, you get:
- "workspaces sentineliq-welcome in filter set, but no workspace folder present"
- Permission errors on `node_modules/@swc`

## Root Cause
The parent `frontend/package.json` defines `welcome` as a workspace dependency. You must install from the **parent directory**, not from the welcome subfolder.

## Solution

### Step 1: Stop any npm processes
Press `Ctrl+C` in the terminal if npm is still running.

### Step 2: Clean up node_modules
```powershell
# Navigate to frontend root
cd c:\Users\USER\Desktop\IQ-main\frontend

# Remove all node_modules (use PowerShell as admin if needed)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force welcome/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force userdashboard/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force analystdashboard/node_modules -ErrorAction SilentlyContinue
```

### Step 3: Clear npm cache
```bash
npm cache clean --force
```

### Step 4: Install from parent directory (IMPORTANT!)
```bash
# Make sure you're in c:\Users\USER\Desktop\IQ-main\frontend
cd c:\Users\USER\Desktop\IQ-main\frontend

# Install all workspace dependencies at once
npm install
```

### Step 5: Start services
Each service runs independently from its directory:

```bash
# Terminal 1 - Welcome (Port 5000)
cd c:\Users\USER\Desktop\IQ-main\frontend\welcome
npm run dev

# Terminal 2 - Admin (Port 3000)
cd c:\Users\USER\Desktop\IQ-main\frontend
npm run dev

# Terminal 3 - Analyst (Port 4100)
cd c:\Users\USER\Desktop\IQ-main\frontend\analystdashboard
npm run dev

# Terminal 4 - Viewer (Port 4000)
cd c:\Users\USER\Desktop\IQ-main\frontend\userdashboard
npm run dev
```

## Important Notes

✅ **Install from parent**: Always run `npm install` from `c:\Users\USER\Desktop\IQ-main\frontend`  
✅ **Run dev from subdir**: Can run `npm run dev` from each service's directory  
✅ **Workspace structure**: The root `package.json` manages all 4 services  
✅ **One install**: Running `npm install` from parent installs dependencies for all 4 services  

## If you still get permission errors:

```powershell
# Option 1: Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator

# Option 2: Use /S flag to skip locked files
npm install --prefer-offline --no-audit

# Option 3: Delete package-lock.json and try again
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

## Verification

After installation succeeds, verify with:
```bash
# From frontend directory
npm list

# Should show:
# sentineliq-dashboard
# ├── welcome
# ├── userdashboard
# └── analyticsdashboard
```

---

**Quick Fix Summary:**
```bash
cd c:\Users\USER\Desktop\IQ-main\frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache clean --force
npm install
```

That's it! The installation should now succeed.
