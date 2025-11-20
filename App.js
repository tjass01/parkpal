import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { Text } from 'react-native';
import { auth } from './firebaseConfig';
import * as Notifications from "expo-notifications";

// Screens
import LoginScreen from './screens/LoginScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SettingsScreen from './screens/SettingScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef(null); // for handling push navigation

  // Handle push notification clicks
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const markerId = response.notification.request.content.data?.markerId;
        if (markerId && navigationRef.current) {
          navigationRef.current.navigate("Map", { markerId });
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null; // or custom loading screen
  }

  // Initial navigation tabs
  function MainTabs() {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🗺️</Text>,
          }}
        />
        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🔔</Text>,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>👤</Text>,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>📊</Text>,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>⚙️</Text>,
          }}
        />
      </Tab.Navigator>
    );
  }

  // Show main app if logged in, otherwise show login screen
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
