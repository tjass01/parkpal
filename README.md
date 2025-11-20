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

### 🔍 Filter & Search
- **Filter Options**: View all reports, only available, or only unavailable spots
- **Location Search**: Search for campus locations (e.g., "Memorial Union", "Bascom Hall")
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
- Google Geocoding API

## Team
- Tejas Parasumanna  parasumanna@wisc.edu — tjass01
- Jivesh Mehta jmehta22@wisc.edu - Jivesh0703
- Cole Niemann cjniemann@wisc.edu - ColeNiemann
- Sunghoon Lee slee2342@wisc.edu - leondevazel

## Project Structure
```
parkpal/
├── screens/
│   ├── LoginScreen.js       # Login interface
│   ├── SignupScreen.js      # Registration interface
│   ├── MapScreen.js         # Main map with reports, filters, and search
│   └── ProfileScreen.js     # User profile, statistics, and report history
├── firebaseConfig.js        # Firebase configuration
├── App.js                   # Navigation setup
└── package.json             # Dependencies
```