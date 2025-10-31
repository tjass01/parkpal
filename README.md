# ParkPal

UW-Madison campus real-time crowdsourced parking availability app.

## Features
- Real-time parking availability reporting
- Interactive map with parking markers
- User authentication (Login/Signup)
- Firebase real-time database integration

## Setup Instructions

### Prerequisites
- Node.js (v20.x or higher)
- npm
- Expo Go app on your phone

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tjass01/parkpal.git
cd parkpal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

### Running on Your Phone

1. Install **Expo Go** app from App Store (iOS) or Play Store (Android)

2. Make sure your phone and computer are on the **same Wi-Fi network**

3. Scan the QR code:
   - **Android**: Open Expo Go app and scan QR code
   - **iOS**: Open Camera app and scan QR code

4. If it doesn't work, try tunnel mode:
```bash
npx expo start --tunnel
```

## Tech Stack
- React Native
- Expo
- Firebase (Authentication + Realtime Database)
- React Navigation
- React Native Maps

## Team
- Tejas Parasumanna  parasumanna@wisc.edu — tjass01
- Jivesh Mehta- jmehta22@wisc.edu- Jivesh0703
- Cole Niemann cjniemann@wisc.edu ColeNiemann
- Sunghoon Lee slee2342@wisc.edu - leondevazel

## Project Structure
```
parkpal-new/
├── screens/
│   ├── LoginScreen.js
│   ├── MapScreen.js
│   ├── ProfileScreen.js
│   └── ReportScreen.js
├── firebaseConfig.js
├── App.js
└── package.json
```