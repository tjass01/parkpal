import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { auth, database } from '../firebaseConfig';
import { signOut, deleteUser } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo, remove } from 'firebase/database';

export default function ProfileScreen({ navigation }) {
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0,
  });

  const userEmail = auth.currentUser?.email;

  useEffect(() => {
    if (!userEmail) return;

    // Fetch user's reports from Firebase
    const reportsRef = ref(database, 'parkingReports');
    const userReportsQuery = query(reportsRef, orderByChild('reportedBy'), equalTo(userEmail));

    const unsubscribe = onValue(userReportsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reportsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Sort by timestamp (newest first)
        reportsArray.sort((a, b) => b.timestamp - a.timestamp);

        setMyReports(reportsArray);

        // Calculate statistics
        const total = reportsArray.length;
        const available = reportsArray.filter((r) => r.isAvailable).length;
        const unavailable = total - available;

        setStats({ total, available, unavailable });
      } else {
        setMyReports([]);
        setStats({ total: 0, available: 0, unavailable: 0 });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                // Delete all user's reports from database
                const reportsRef = ref(database, 'parkingReports');
                const userReportsQuery = query(
                  reportsRef,
                  orderByChild('reportedBy'),
                  equalTo(user.email)
                );

                const snapshot = await new Promise((resolve) => {
                  onValue(userReportsQuery, resolve, { onlyOnce: true });
                });

                const data = snapshot.val();
                if (data) {
                  const deletePromises = Object.keys(data).map((key) =>
                    remove(ref(database, `parkingReports/${key}`))
                  );
                  await Promise.all(deletePromises);
                }

                // Delete user account
                await deleteUser(user);
                navigation.replace('Login');
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const deleteReport = (reportId) => {
    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const reportRef = ref(database, `parkingReports/${reportId}`);
            await remove(reportRef);
            Alert.alert('Success', 'Report deleted successfully');
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e0e0e0' }]}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.unavailable}</Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
        </View>
      </View>

      {/* My Reports */}
      <View style={styles.reportsContainer}>
        <Text style={styles.sectionTitle}>My Reports</Text>
        {myReports.length === 0 ? (
          <Text style={styles.noReportsText}>No reports yet. Start reporting parking spots!</Text>
        ) : (
          myReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={[styles.statusBadge, { backgroundColor: report.isAvailable ? '#4CAF50' : '#F44336' }]}>
                  <Text style={styles.statusText}>
                    {report.isAvailable ? '✓ Available' : '✗ Unavailable'}
                  </Text>
                </View>
                <Text style={styles.timeAgo}>{getTimeAgo(report.timestamp)}</Text>
              </View>
              <Text style={styles.coordinates}>
                📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteReport(report.id)}
              >
                <Text style={styles.deleteButtonText}>Delete Report</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  reportsContainer: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noReportsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
  reportCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timeAgo: {
    color: '#666',
    fontSize: 14,
  },
  coordinates: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 15,
  },
  logoutButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteAccountButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});