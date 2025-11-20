import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

export default function AnalyticsScreen() {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0,
    lastTime: 'N/A',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const analyticsRef = ref(database, `users/${user.uid}/analytics`);
    const unsubscribe = onValue(analyticsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStats({
        total: data.total || 0,
        available: data.available || 0,
        unavailable: data.unavailable || 0,
        lastTime: new Date().toLocaleString(),
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Loading Analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>📊 Your Parking Analytics</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Total Reports</Text>
          <Text style={styles.value}>{stats.total}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Available Spots Reported</Text>
          <Text style={[styles.value, { color: '#4CAF50' }]}>{stats.available}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Unavailable Spots Reported</Text>
          <Text style={[styles.value, { color: '#F44336' }]}>{stats.unavailable}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Last Report Time</Text>
          <Text style={styles.lastTime}>{stats.lastTime}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    padding: 25,
    paddingBottom: 40,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  lastTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
