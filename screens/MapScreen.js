import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { database, auth } from '../firebaseConfig';
import { ref, push, onValue, serverTimestamp, update, remove, get } from 'firebase/database';

// --- Configure Notification Behavior ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- Distance Helper (km) ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [parkingReports, setParkingReports] = useState([]);
  const [notifiedIds, setNotifiedIds] = useState(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // 1️⃣ Load user notification preference
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const prefRef = ref(database, `users/${user.uid}/notificationsEnabled`);
    get(prefRef).then((snapshot) => {
      if (snapshot.exists()) setNotificationsEnabled(snapshot.val());
      else setNotificationsEnabled(true);
    });
  }, []);

  // 2️⃣ Request notification permission
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications to get parking alerts!');
      }
    })();
  }, []);

  // 3️⃣ Get user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  // 4️⃣ Listen for parking updates and trigger notifications if nearby
  useEffect(() => {
    const reportsRef = ref(database, 'parkingReports');
    const unsubscribe = onValue(reportsRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const parsed = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      setParkingReports(parsed);

      // Only notify if user enabled notifications
      if (region && notificationsEnabled) {
        parsed.forEach(async (r) => {
          if (r.isAvailable && !notifiedIds.has(r.id)) {
            const dist = getDistance(region.latitude, region.longitude, r.latitude, r.longitude);
            if (dist < 0.3) { // within 300 meters
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '🚗 Spot Available Nearby!',
                  body: 'A new parking spot just opened close to you.',
                },
                trigger: null,
              });
              setNotifiedIds((prev) => new Set([...prev, r.id]));
            }
          }
        });
      }
    });
    return () => unsubscribe();
  }, [region, notificationsEnabled, notifiedIds]);

  // 5️⃣ Report a new spot
  const reportParking = async (available) => {
    if (!region) {
      Alert.alert('Error', 'Location not available');
      return;
    }
    try {
      const reportsRef = ref(database, 'parkingReports');
      await push(reportsRef, {
        latitude: region.latitude,
        longitude: region.longitude,
        isAvailable: available,
        timestamp: serverTimestamp(),
      });
      setReportModalVisible(false);
      Alert.alert('Reported', `Marked as ${available ? 'available' : 'unavailable'}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // 6️⃣ Toggle or delete marker
  const handleMarkerPress = (id, currentStatus) => {
    Alert.alert(
      'Modify Parking Spot',
      'What would you like to do?',
      [
        {
          text: currentStatus ? 'Mark Unavailable' : 'Mark Available',
          onPress: async () => {
            const reportRef = ref(database, `parkingReports/${id}`);
            await update(reportRef, { isAvailable: !currentStatus });
          },
        },
        {
          text: 'Delete Marker',
          style: 'destructive',
          onPress: async () => {
            const reportRef = ref(database, `parkingReports/${id}`);
            await remove(reportRef);
            Alert.alert('Deleted', 'Marker removed from map.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!region) {
    return (
      <View style={styles.center}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsCompass={true}
      >
        {parkingReports.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            pinColor={r.isAvailable ? 'green' : 'red'}
            title={r.isAvailable ? 'Parking Available' : 'Parking Unavailable'}
            onPress={() => handleMarkerPress(r.id, r.isAvailable)}
          />
        ))}
      </MapView>

      {/* Crosshair */}
      <View style={styles.crosshair}>
        <Text style={{ fontSize: 28 }}>📍</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileText}>👤</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setReportModalVisible(true)}
      >
        <Text style={styles.reportText}>Report</Text>
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Parking Status</Text>
            <Text style={styles.locationText}>
              Selected: {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.greenBtn]}
              onPress={() => reportParking(true)}
            >
              <Text style={styles.btnText}>Parking Available ✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.redBtn]}
              onPress={() => reportParking(false)}
            >
              <Text style={styles.btnText}>Parking Unavailable ✗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setReportModalVisible(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -13,
    marginTop: -26,
    zIndex: 10,
  },
  profileButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  profileText: { fontSize: 22 },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 5,
  },
  reportText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  locationText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 15 },
  modalBtn: {
    width: '100%',
    padding: 18,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: 'center',
  },
  greenBtn: { backgroundColor: '#4CAF50' },
  redBtn: { backgroundColor: '#F44336' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { marginTop: 10, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#555' },
});
