# Dmonitor Mobile

This folder contains the Android/iOS app for Dmonitor.

## Stack
- Expo
- React Native
- TypeScript

## Run locally

1. Install dependencies:
   ```bash
   cd mobile_apps
   npm install
   ```
   If you are wiring this into an Expo runtime, also ensure the AsyncStorage package listed in `package.json` is installed.
2. Start the app:
   ```bash
   npm run start
   ```
3. Build or run on a device/emulator:
   ```bash
   npm run android
   npm run ios
   ```

## Notes
- The app is scaffolded for both Android and iOS.
- UI is intentionally simple and can be wired to the backend service in the next step.
- Asset placeholders referenced in `app.json` should be added under `mobile_apps/assets/` before publishing.
