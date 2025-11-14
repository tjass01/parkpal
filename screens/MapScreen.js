import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { database, auth } from '../firebaseConfig';
import { ref, push, onValue, serverTimestamp, update, remove, get, set } from 'firebase/database';
import { useRoute, useIsFocused } from '@react-navigation/native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [parkingReports, setParkingReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [radius, setRadius] = useState(0.3); // default 300m
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  const route = useRoute();
  const markerId = route.params?.markerId;

  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const isFocused = useIsFocused();

  const [lastCenteredMarkerId, setLastCenteredMarkerId] = useState(null);
  const [initialCentered, setInitialCentered] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    get(ref(database, `users/${user.uid}/radius`)).then(snap => {
      if (snap.exists()) setRadius(snap.val());
    });

    get(ref(database, `users/${user.uid}/notificationsEnabled`)).then(snap => {
      if (snap.exists()) setNotificationsEnabled(snap.val());
    });
  }, []);

  useEffect(() => {
    (async () => {
      const notif = await Notifications.requestPermissionsAsync();
      const loc = await Location.requestForegroundPermissionsAsync();

      if (notif.status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications for parking alerts.');
      }

      if (loc.status !== 'granted') {
        Alert.alert('Location is required.');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  useEffect(() => {
    if (!mapReady || !region || initialCentered) return;
    mapRef.current?.animateToRegion(region, 800);
    setInitialCentered(true);
  }, [mapReady, region, initialCentered]);

  useEffect(() => {
    const reportsRef = ref(database, 'parkingReports');
    const unsubscribe = onValue(reportsRef, async snapshot => {
      const data = snapshot.val() || {};
      const arr = Object.keys(data).map(id => ({ id, ...data[id] }));
      setParkingReports(arr);

      if (!region || !notificationsEnabled) return;

      arr.forEach(async r => {
        if (!r.isAvailable || notifiedIds.has(r.id)) return;

        const dist = getDistance(region.latitude, region.longitude, r.latitude, r.longitude);

        if (dist < radius) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚗 New Parking Spot',
              body: 'A new parking spot opened near you!',
              data: { markerId: r.id },
            },
            trigger: null,
          });

          const user = auth.currentUser;
          push(ref(database, `users/${user.uid}/notifications`), {
            title: 'Parking Spot Nearby',
            body: 'A new spot opened near you.',
            markerId: r.id,
            timestamp: Date.now(),
          });

          setNotifiedIds(prev => new Set([...prev, r.id]));
        }
      });
    });
    return () => unsubscribe();
  }, [region, notificationsEnabled, notifiedIds, radius]);

  useEffect(() => {
    if (!mapReady || !markerId || !parkingReports.length || !isFocused) return;
    if (lastCenteredMarkerId === markerId) return;

    const target = parkingReports.find(r => r.id === markerId);
    if (!target) return;

    mapRef.current?.animateToRegion(
      {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800
    );

    setLastCenteredMarkerId(markerId);
  }, [markerId, parkingReports, mapReady, isFocused, lastCenteredMarkerId]);

  const reportParking = async (available) => {
    if (!region) return;

    await push(ref(database, 'parkingReports'), {
      latitude: region.latitude,
      longitude: region.longitude,
      isAvailable: available,
      timestamp: serverTimestamp(),
    });

    setReportModalVisible(false);
    Alert.alert('Thanks!', `Spot marked as ${available ? 'available' : 'unavailable'}.`);
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
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsCompass
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={setRegion}
      >
        {parkingReports.map(r => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            pinColor={r.isAvailable ? 'green' : 'red'}
            title={r.isAvailable ? 'Available' : 'Unavailable'}
            description="Tap to modify or delete"
            onPress={() =>
              Alert.alert('Modify Spot', '', [
                {
                  text: r.isAvailable ? 'Mark Unavailable' : 'Mark Available',
                  onPress: () =>
                    update(ref(database, `parkingReports/${r.id}`), {
                      isAvailable: !r.isAvailable,
                    }),
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => remove(ref(database, `parkingReports/${r.id}`)),
                },
                { text: 'Cancel' },
              ])
            }
          />
        ))}
      </MapView>

      <View style={styles.crosshair}>
        <Text style={{ fontSize: 28 }}>📍</Text>
      </View>

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileText}>👤</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(true)}>
        <Text style={styles.reportText}>Report</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.radiusButton}
        onPress={() => setRadiusModalVisible(true)}
      >
        <Text style={styles.radiusText}>⚙️ Radius</Text>
      </TouchableOpacity>

      <Modal visible={radiusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notification Radius</Text>

            {[0.1, 0.2, 0.3, 0.5, 1.0].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.modalBtn, radius === v ? styles.greenBtn : styles.redBtn]}
                onPress={() => {
                  const user = auth.currentUser;
                  setRadius(v);
                  set(ref(database, `users/${user.uid}/radius`), v);
                  setRadiusModalVisible(false);
                }}
              >
                <Text style={styles.btnText}>
                  {v < 1 ? `${v * 1000} m` : '1 km'}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setRadiusModalVisible(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Parking</Text>
            <Text style={styles.locationText}>
              {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
            </Text>

            <TouchableOpacity
              style={[styles.modalBtn, styles.greenBtn]}
              onPress={() => reportParking(true)}
            >
              <Text style={styles.btnText}>Available ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, styles.redBtn]}
              onPress={() => reportParking(false)}
            >
              <Text style={styles.btnText}>Unavailable ✗</Text>
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
  radiusButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
  },
  radiusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  locationText: { textAlign: 'center', marginBottom: 15, color: '#666' },
  modalBtn: {
    padding: 18,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: 'center',
  },
  greenBtn: { backgroundColor: '#4CAF50' },
  redBtn: { backgroundColor: '#F44336' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', marginTop: 10 },
  cancelText: { fontSize: 16, color: '#555' },
});
