# MathPulse AI — Android Capacitor APK & Release Guide

This document outlines the complete setup, development, build, and release process for the **MathPulse AI** Android application powered by Capacitor.

---

## 1. Prerequisites & Environment Setup

### Required Tools
- **Node.js**: v20.x or v22.x LTS (`node -v`)
- **Java Development Kit (JDK)**: JDK 21 LTS (e.g., [Eclipse Adoptium Temurin 21](https://adoptium.net/))
- **Android Studio**: Android Studio Koala / Ladybug or newer (or Android SDK Command-line Tools)
- **Android SDK Components**:
  - Android SDK Platform 34 or 35 (API level 34/35)
  - Android SDK Build-Tools 34.0.0 or 35.0.0
  - Android SDK Platform-Tools (includes `adb`)
  - Android Emulator (optional, for virtual device testing)

### Environment Variables
Configure the following in your system or user environment:

**Windows (PowerShell / System Properties):**
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
```

**macOS / Linux (`~/.bashrc` or `~/.zshrc`):**
```bash
export JAVA_HOME="/path/to/jdk-21"
export ANDROID_HOME="$HOME/Android/Sdk" # or "$HOME/Library/Android/sdk" on macOS
export PATH="$PATH:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

---

## 2. Project Architecture Overview

MathPulse AI uses a hybrid architecture:
- **Frontend App Shell**: React 18 + TypeScript + Vite, bundled directly into the APK assets directory (`android/app/src/main/assets/public`).
- **Native Bridge**: Capacitor 7 (@capacitor/core, @capacitor/android, @capacitor/app, @capacitor/splash-screen, @capacitor/status-bar).
- **Backend API**: A standalone FastAPI Python backend hosted on a public HTTPS server (e.g., Cloud Run, Railway, Hugging Face Spaces, or dedicated VPS).
- **Firebase Services**: Firebase Auth, Firestore, Realtime Database, Cloud Storage, and Cloud Functions.

```
MATHPULSE-AI/
├── src/                     # React + TypeScript Frontend
├── public/                  # Static Web & PWA assets + App Icons
├── build/                   # Vite Production Web Bundle (webDir)
├── capacitor.config.ts      # Capacitor configuration (appId, appName, webDir)
├── android/                 # Native Android Gradle Project
│   ├── app/
│   │   ├── build.gradle     # Application build config & dependencies
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissions & App activities
│   │       ├── java/        # Native Android entry point (MainActivity)
│   │       └── res/         # Icons (mipmap-*), Splash (drawable-*), Colors, Strings
│   └── variables.gradle     # SDK version definitions (minSdk 24, targetSdk 35)
└── docs/
    └── ANDROID_APK_SETUP.md # This guide
```

---

## 3. First-Time Setup & Local Workflow

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env.local` (or create a dedicated `.env.production` for release builds):
```bash
cp .env.example .env.local
```

Fill in your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=mathpulse-ai-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mathpulse-ai-2026
VITE_FIREBASE_STORAGE_BUCKET=mathpulse-ai-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...
VITE_FIREBASE_DATABASE_URL=https://mathpulse-ai-2026-default-rtdb.firebaseio.com
```

Set the backend API URL for Android:
```env
# For local Android Emulator connecting to local FastAPI:
VITE_API_URL=http://10.0.2.2:8000

# For local Physical Device on same Wi-Fi:
VITE_API_URL=http://192.168.1.xxx:8000

# For Production APK:
VITE_API_URL=https://api.your-mathpulse-backend.com
```

### Step 3: Build Web Assets & Sync with Capacitor
```bash
npm run build
npx cap sync android
```

### Step 4: Open in Android Studio
```bash
npm run cap:android
# or: npx cap open android
```
In Android Studio:
1. Wait for Gradle sync to complete.
2. Select an emulator (e.g., Pixel 8 API 34) or connect a physical Android device with USB debugging enabled.
3. Click **Run** (`Shift + F10`).

---

## 4. Building the Debug APK

To build the debug APK directly via command line:

**Using npm script:**
```bash
npm run android:debug
```

**Using Gradle directly:**
```bash
# Windows (PowerShell)
cd android
.\gradlew.bat assembleDebug

# macOS / Linux
cd android
./gradlew assembleDebug
```

### Expected Output Location
Upon successful build, the debug APK is located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

To install directly to a connected device via ADB:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Building Signed Release APK & AAB (Google Play)

### Step 1: Generate a Release Keystore
If you do not already have a release keystore, generate one using `keytool` (shipped with JDK):

```bash
keytool -genkey -v -keystore mathpulse-release.keystore -alias mathpulse-key -keyalg RSA -keysize 2048 -validity 10000
```
> [!CAUTION]
> **Keep your keystore secure!**
> Never commit `mathpulse-release.keystore` or any `.jks` file to git. Store the keystore and passwords in a secure password manager or CI/CD secret manager.

### Step 2: Configure Gradle Release Signing
Create or edit `~/.gradle/gradle.properties` (or set environment variables) to provide signing credentials without committing them to the repository:

```properties
MATHPULSE_RELEASE_STORE_FILE=C:/path/to/mathpulse-release.keystore
MATHPULSE_RELEASE_KEY_ALIAS=mathpulse-key
MATHPULSE_RELEASE_STORE_PASSWORD=your_store_password
MATHPULSE_RELEASE_KEY_PASSWORD=your_key_password
```

In `android/app/build.gradle`:
```groovy
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MATHPULSE_RELEASE_STORE_FILE')) {
                storeFile file(MATHPULSE_RELEASE_STORE_FILE)
                storePassword MATHPULSE_RELEASE_STORE_PASSWORD
                keyAlias MATHPULSE_RELEASE_KEY_ALIAS
                keyPassword MATHPULSE_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build the Release Binaries

**Option A: Android App Bundle (AAB) for Google Play Store**
```bash
# Web build + sync
npm run build
npx cap sync android

# Build AAB
cd android
.\gradlew.bat bundleRelease  # Windows
# or ./gradlew bundleRelease # Linux/macOS
```
**Output AAB path:**
`android/app/build/outputs/bundle/release/app-release.aab`

**Option B: Standalone Release APK**
```bash
cd android
.\gradlew.bat assembleRelease  # Windows
# or ./gradlew assembleRelease # Linux/macOS
```
**Output APK path:**
`android/app/build/outputs/apk/release/app-release.apk`

---

## 6. Firebase & Backend Integration Requirements

### Firebase Configuration
1. Open [Firebase Console](https://console.firebase.google.com/) for project `mathpulse-ai-2026`.
2. Navigate to **Project Settings** → **General** → **Your apps** → **Add app** → **Android**.
3. Register Android Package Name:
   - **Android package name**: `com.deign86.mathpulse`
   - **App nickname**: `MathPulse AI`
   - **Debug signing certificate SHA-1** (optional, recommended for Google Sign-In): obtain via `cd android && ./gradlew signingReport`.
4. Download `google-services.json` and place it in `android/app/google-services.json`.

### FastAPI Backend CORS & Network Security
1. The FastAPI backend must permit the origins used by Android WebView:
   ```python
   # In FastAPI main.py
   origins = [
       "http://localhost:5173",
       "https://localhost",
       "http://localhost",
       "capacitor://localhost",
       "https://mathpulse-ai-2026.web.app",
       "https://mathpulse-ai-2026.firebaseapp.com"
   ]
   ```
2. Production builds must use HTTPS for all endpoints. Android blocks unencrypted HTTP traffic by default.

---

## 7. Testing & Quality Assurance Checklist

Verify the following before deploying updates or publishing release builds:

- [ ] **Authentication Persistence**: Log in as a student/teacher, fully close the app (swipe away from recent apps), and relaunch. User must remain logged in.
- [ ] **Hardware Back Button**:
  - When a modal or drawer is open (Settings, Profile, Rewards, Calculator, Mobile Sidebar), pressing Back must close the topmost modal.
  - When viewing a sub-page (e.g. `/modules`, `/chat`, `/battle`), pressing Back must navigate back toward Dashboard (`/`).
  - When on Dashboard (`/`) with no modals open, pressing Back exits or minimizes the app.
- [ ] **Safe Area & Notch Insets**: No text, headers, or bottom action bars are cut off by the status bar, camera notch, or Android navigation pill.
- [ ] **Soft Keyboard Avoidance**: Input fields in chat, login, and assessment forms stay visible and scrollable when the virtual keyboard appears.
- [ ] **Realtime Database**: Matchmaking in Quiz Battle connects and updates score state.
- [ ] **Firestore & Storage**: Progress saves, diagnostic assessments record, and avatar customization persists.
- [ ] **Offline / Network Banner**: Disconnecting Wi-Fi/data displays the offline warning banner without crashing the WebView.
