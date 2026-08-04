# 🚀 EAS Project Creation Guide

Complete guide to create your EAS project and configure builds.

---

## 📋 Prerequisites

- ✅ Node.js 16+ installed
- ✅ npm installed
- ✅ Expo account created (free at expo.dev)
- ✅ EAS CLI installed (`npm install -g eas-cli`)
- ✅ app.json configured (already done)
- ✅ eas.json configured (already done)

---

## 🔐 Step 1: Login to EAS (Browser Required)

**This step requires browser access from your computer.**

### Option A: CLI Login (Recommended)

Run on your local machine (not the remote environment):

```bash
cd operadorpro-mobile
eas login
```

**This will:**
1. Open browser to login.expo.dev
2. Ask you to sign in or create account
3. Authorize the EAS CLI
4. Return to terminal with success message

### Option B: Use Expo Web Dashboard

If CLI login doesn't work:

1. Go to: https://expo.dev
2. Sign in with your Expo account
3. Go to: https://expo.dev/eas
4. Create project from dashboard

---

## 🎯 Step 2: Create EAS Project

After login, run:

```bash
cd operadorpro-mobile
eas project:create
```

**You'll be asked:**

```
? What would you like to name your project?
```

**Answer:** `OperadorPro` (or `operadorpro-mobile`)

**Result:**
```
✅ Project created successfully
Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**⚠️ IMPORTANT: Copy the PROJECT_ID - you'll need it next!**

---

## 🔑 Step 3: Add Project ID to app.json

Edit: `operadorpro-mobile/app.json`

Find the `"projectId"` field (around line 3-5):

**Before:**
```json
{
  "expo": {
    "projectId": "YOUR_PROJECT_ID_HERE"
  }
}
```

**After:**
```json
{
  "expo": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

Replace `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` with your actual Project ID.

### Verify it's correct:

```bash
cd operadorpro-mobile
eas project:info
```

Should show your project details.

---

## ✅ Step 4: Verify Setup

Run validation:

```bash
bash scripts/validate-config.sh
```

Should show: ✅ All checks passed

---

## 🏗️ Step 5: Configure Build Profiles

Your `eas.json` already has profiles, but verify they're correct:

```bash
cat operadorpro-mobile/eas.json | grep -A 5 "profiles"
```

Should show:
```
"development": { ... }
"preview": { ... }
"production": { ... }
```

---

## 🧪 Step 6: Test EAS Setup

Quick test to ensure everything works:

```bash
cd operadorpro-mobile

# Check project is linked
eas project:info

# Check credentials status
eas credentials
```

Should return project information without errors.

---

## 📊 Your EAS Project Dashboard

After creation, access at:

**https://expo.dev/eas**

Here you can:
- ✅ View build history
- ✅ Manage credentials
- ✅ Monitor build status
- ✅ View build logs
- ✅ Manage submissions

---

## 🚀 Next Steps

Once Project ID is added to app.json:

### 1. Create Build for Development

```bash
cd operadorpro-mobile

# iOS development
eas build --platform ios --profile development

# Android development
eas build --platform android --profile development
```

### 2. Create Build for Production

```bash
# iOS production (for App Store)
eas build --platform ios --profile production

# Android production (for Google Play)
eas build --platform android --release-channel production
```

### 3. Submit to App Stores

Once builds complete:

```bash
# Submit both
eas submit --latest

# Or specific platform
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## 📋 Checklist

After completing this guide:

- [ ] Logged in to EAS (`eas login`)
- [ ] Created EAS project (`eas project:create`)
- [ ] Copied PROJECT_ID
- [ ] Updated app.json with PROJECT_ID
- [ ] Verified setup (`eas project:info`)
- [ ] Validator passes (`bash scripts/validate-config.sh`)

---

## 🆘 Troubleshooting

### "Not authenticated"
```bash
# Run login again
eas login
```

### "Project not found"
- Verify PROJECT_ID is correct in app.json
- Check: `eas project:info`
- Run: `eas project:create` to create new project

### "Invalid project ID format"
- PROJECT_ID should be: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Not: `operadorpro` or project name
- Copy from: `eas project:create` output

### "Build fails - credentials error"
- First build creates certificates/keys automatically
- Wait 2-3 minutes
- Try again: `eas build --platform ios --profile development`

### "Can't find app.json"
- Make sure you're in: `operadorpro-mobile/` directory
- Not the root `operadorpro/` directory

---

## 📚 Full Workflow

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login (requires browser)
eas login

# 3. Navigate to mobile directory
cd operadorpro-mobile

# 4. Create project
eas project:create
# Copy PROJECT_ID from output

# 5. Update app.json with PROJECT_ID
nano app.json
# Find "projectId": "YOUR_PROJECT_ID_HERE"
# Replace with actual PROJECT_ID

# 6. Verify setup
eas project:info

# 7. Validate configuration
bash ../scripts/validate-config.sh

# 8. Ready for builds!
eas build --platform ios --profile development
```

---

## 🎯 Important Notes

1. **PROJECT_ID is NOT your Expo username**
   - It's a unique UUID generated for your project
   - Example: `12345678-1234-1234-1234-123456789012`

2. **Can't change it later easily**
   - Keep it safe
   - Don't commit to public repos
   - Store in 1Password or similar

3. **Different from Bundle ID**
   - Bundle ID: `com.operadorpro.app` (app identifier)
   - Project ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (EAS project)

4. **Need for each platform build**
   - iOS builds use PROJECT_ID
   - Android builds use PROJECT_ID
   - Submissions use PROJECT_ID

---

## ✅ Quick Command Reference

```bash
# Login
eas login

# Create project
eas project:create

# View project info
eas project:info

# View credentials
eas credentials

# Build iOS dev
eas build --platform ios --profile development

# Build Android dev
eas build --platform android --profile development

# Build iOS prod
eas build --platform ios --profile production

# Build Android prod
eas build --platform android --release-channel production

# Submit latest build
eas submit --latest

# Submit specific
eas submit --platform ios --latest

# View build status
eas build:list

# View build details
eas build:view <BUILD_ID>

# View build logs
eas build:logs <BUILD_ID>
```

---

**Ready? Start with Step 1 above, then come back and let me know the PROJECT_ID!** 🚀
