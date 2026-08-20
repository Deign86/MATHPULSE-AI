import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deign86.mathpulse',
  appName: 'MathPulse AI',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // Do NOT set server.url for production APKs. The APK must load bundled assets from webDir.
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f7f9fc',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#9956DE',
      overlaysWebView: false,
    },
  },
  android: {
    backgroundColor: '#f7f9fc',
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
