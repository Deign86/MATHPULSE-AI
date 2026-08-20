# Acceptance Gates: Capacitor Android Support

Task: Convert MATHPULSE-AI into a production-ready Android APK using Capacitor with web backward compatibility.

- [x] G1: Capacitor dependencies in package.json
  CHECK: node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json')); const deps = {...pkg.dependencies, ...pkg.devDependencies}; ['@capacitor/core', '@capacitor/cli', '@capacitor/android', '@capacitor/app'].forEach(d => { if (!deps[d]) throw new Error('Missing ' + d); }); console.log('ALL_CAPACITOR_DEPS_FOUND');"
  EXPECT: ALL_CAPACITOR_DEPS_FOUND
  EVIDENCE: ALL_CAPACITOR_DEPS_FOUND (@capacitor/core@7.1.2, @capacitor/android@7.1.2, @capacitor/cli@7.1.2, @capacitor/app@7.1.2, @capacitor/splash-screen@7.0.5, @capacitor/status-bar@7.0.6)

- [x] G2: Capacitor config created with appId, appName, and webDir
  CHECK: node -e "const fs = require('fs'); const content = fs.readFileSync('capacitor.config.ts', 'utf8'); if (!content.includes('com.deign86.mathpulse') || !content.includes('MathPulse AI') || !content.includes('build')) throw new Error('Invalid config'); console.log('CAPACITOR_CONFIG_VALID');"
  EXPECT: CAPACITOR_CONFIG_VALID
  EVIDENCE: CAPACITOR_CONFIG_VALID (appId: com.deign86.mathpulse, appName: MathPulse AI, webDir: build)

- [x] G3: Web application production build succeeds
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: ✓ built in 10.49s (assets emitted into build/)

- [x] G4: PWA build validation passes
  CHECK: npm run validate:pwa
  EXPECT: PASSED
  EVIDENCE: ## PWA Build Validation - Validation outcome: PASSED (manifest.webmanifest, service-workers, 4 icons detected)

- [x] G5: Android native project structure initialized
  CHECK: node -e "const fs = require('fs'); const gradle = fs.readFileSync('android/app/build.gradle', 'utf8'); const strings = fs.readFileSync('android/app/src/main/res/values/strings.xml', 'utf8'); if (!gradle.includes('com.deign86.mathpulse') || !strings.includes('MathPulse AI')) throw new Error('Package mismatch'); console.log('ANDROID_PROJECT_VALID');"
  EXPECT: ANDROID_PROJECT_VALID
  EVIDENCE: ANDROID_PROJECT_VALID (namespace: com.deign86.mathpulse, app_name: MathPulse AI, adaptive mipmap icons & splash screens generated across all densities)

- [x] G6: Android back button handler hook created
  CHECK: node -e "const fs = require('fs'); if (!fs.existsSync('src/hooks/useCapacitorBackButton.ts')) throw new Error('Missing hook'); console.log('BACK_BUTTON_HOOK_EXISTS');"
  EXPECT: BACK_BUTTON_HOOK_EXISTS
  EVIDENCE: BACK_BUTTON_HOOK_EXISTS (src/hooks/useCapacitorBackButton.ts wired to all active modals, sub-routes, and exitApp)

- [x] G7: Android setup and release guide created
  CHECK: node -e "const fs = require('fs'); if (!fs.existsSync('docs/ANDROID_APK_SETUP.md')) throw new Error('Missing doc'); const content = fs.readFileSync('docs/ANDROID_APK_SETUP.md', 'utf8'); if (!content.includes('Debug APK') || !content.includes('Release')) throw new Error('Doc incomplete'); console.log('DOCS_VALID');"
  EXPECT: DOCS_VALID
  EVIDENCE: DOCS_VALID (docs/ANDROID_APK_SETUP.md includes prerequisites, debug APK commands, release keystore/signing guide, Firebase Android setup, FastAPI CORS requirements, and testing checklist)

- [x] G8: Environment and .gitignore configured safely
  CHECK: node -e "const fs = require('fs'); const gi = fs.readFileSync('.gitignore', 'utf8'); const ee = fs.readFileSync('.env.example', 'utf8'); if (!gi.includes('*.apk') || !gi.includes('*.keystore') || !ee.includes('VITE_API_URL')) throw new Error('Config missing'); console.log('ENV_GITIGNORE_VALID');"
  EXPECT: ENV_GITIGNORE_VALID
  EVIDENCE: ENV_GITIGNORE_VALID (.gitignore protects Android builds, keystores, and local.properties; .env.example documents Android APK VITE_API_URL and CORS origins)
