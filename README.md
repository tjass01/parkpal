# ParkPal

UW-Madison campus real-time crowdsourced parking availability app.

## Features

### 🔐 Authentication
- Email/password login and signup with Firebase Auth
- Secure user sessions with persistent login
- Account deletion option

### 🗺️ Interactive Map
- Real-time map with current location tracking
- Parking status markers:
  - 🟢 Green: Parking available
  - 🔴 Red: Parking unavailable
- Tap markers to see report details (time, reporter, delete option for your reports)

### 📍 Parking Reports
- Report parking availability at current location
- Choose "Available" or "Unavailable" status
- Reports sync instantly to all users via Firebase Realtime Database
- Automatic timestamp tracking

### 🔔 Notifications
- View real-time parking alerts based on your selected radius and location area filters
- Live updates powered by Firebase Realtime Database
- Tap a notification to navigate directly to the exact parking spot on the map
- Displays live distance from current location for each alert
- Notifications automatically sync with filtered markers on the Map screen

### 🔍 Filter & Search
- **Filter Options**: View all reports, only available, or only unavailable spots
- **Radius Filter**: Filter parking reports based on a user-defined distance from current location on MapScreen
- **Location Filter**: Filter reports by campus locations on MapScreen (e.g., Memorial Union, Bascom Hall)
- Map automatically animates to searched location

### 👤 Profile & Statistics
- View your parking report statistics:
  - Total reports
  - Available vs. Unavailable breakdown
- See your complete report history with timestamps
- Delete your past reports
- Logout and account management

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
3. Install dependencies for for accelerometer and vibration:
```bash
npx expo install expo-sensors
npx expo install expo-haptics
```
4. Start the development server:
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
- Google Geocoding API
- Expo Notifications
- Expo Location (GPS)

## Team
- Tejas Parasumanna  parasumanna@wisc.edu — tjass01
- Jivesh Mehta jmehta22@wisc.edu - Jivesh0703
- Cole Niemann cjniemann@wisc.edu - ColeNiemann
- Sunghoon Lee slee2342@wisc.edu - leondevazel

## Project Structure
```
parkpal/
├── screens/
│   ├── LoginScreen.js          # User login interface
│   ├── MapScreen.js            # Main map with reports, filters, and search
│   ├── NotificationsScreen.js # Real-time filtered alerts with live distance and map navigation
│   ├── AnalyticsScreen.js      # User analytics 
│   ├── ReportScreen.js         # Create parking reports
│   ├── ProfileScreen.js        # User profile, statistics, and report history
│   └── SettingScreen.js        # App settings and preferences
├── firebaseConfig.js        # Firebase configuration
├── App.js                   # Navigation setup
└── package.json             # Dependencies
```
