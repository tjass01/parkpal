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
  const R = 3958.8; // Earth radius in MILES
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // returns miles
}

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [parkingReports, setParkingReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [radius, setRadius] = useState(0.3); // default 0.3 miles

  const inRadiusRef = useRef(new Set()); // markerIds currently within radius

  const route = useRoute();
  const markerId = route.params?.markerId;

  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const isFocused = useIsFocused();

  const [lastCenteredMarkerId, setLastCenteredMarkerId] = useState(null);
  const [initialCentered, setInitialCentered] = useState(false);

  const [addFavsBtn, setAddFavsBtn] = useState(false);
  const [addBtnKey, setAddBtnKey] = useState(0); // to force re-render in settings

  // Load user radius + notification toggle from DB
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

  // Permissions
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

  // Initial region + userLocation
  useEffect(() => {
    (async () => {
      const loc = await Location.getCurrentPositionAsync({});
      const initialRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(initialRegion);
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Watch user GPS position for REAL-TIME radius checks
  useEffect(() => {
    let subscription;

    (async () => {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // update every ~10m
        },
        loc => {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Center map once at start
  useEffect(() => {
    if (!mapReady || !region || initialCentered) return;
    mapRef.current?.animateToRegion(region, 800);
    setInitialCentered(true);
  }, [mapReady, region, initialCentered]);

  // Listen to all parking reports in real time + AUTO CLEANUP
useEffect(() => {
  const reportsRef = ref(database, 'parkingReports');
  const unsubscribe = onValue(reportsRef, snapshot => {
    const data = snapshot.val() || {};
    const arr = Object.keys(data).map(id => ({ id, ...data[id] }));
    
    // AUTO-DELETE old reports (older than 2 hours)
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60* 1000; // 2 hours in milliseconds
    
    arr.forEach(report => {
      if (report.timestamp && (now - report.timestamp > TWO_HOURS)) {
        // Delete from Firebase
        remove(ref(database, `parkingReports/${report.id}`));
      }
    });
    
    // Only show reports that are NOT old
    const freshReports = arr.filter(report => {
      if (!report.timestamp) return true; // keep if no timestamp
      return (now - report.timestamp <= TWO_HOURS);
    });
    
    setParkingReports(freshReports);
  });

  return () => unsubscribe();
}, []);

  // REAL-TIME radius logic: maintain /users/{uid}/notifications as "currently in radius"
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    if (!userLocation) return;
    if (!notificationsEnabled) return;
    if (!parkingReports || parkingReports.length === 0) return;

    let cancelled = false;

    (async () => {
      const inRadiusNow = new Set();

      const notifRef = ref(database, `users/${user.uid}/notifications`);
      const notifSnap = await get(notifRef);

      // Current notifications in DB: markerId -> db key
      const markerIdToNotifKey = {};
      if (notifSnap.exists()) {
        const data = notifSnap.val();
        Object.entries(data).forEach(([key, value]) => {
          if (value.markerId) {
            markerIdToNotifKey[value.markerId] = key;
          }
        });
      }

      // 1) Compute which markers are now inside radius
      for (const r of parkingReports) {
        if (!r.isAvailable) continue;

        const dist = getDistance(
          userLocation.latitude,
          userLocation.longitude,
          r.latitude,
          r.longitude
        );

        if (dist <= radius) {
          inRadiusNow.add(r.id);

          // Newly entered marker (was NOT in previous in-radius set)
          if (!inRadiusRef.current.has(r.id)) {
            // Only create DB notification row if not already present
            if (!markerIdToNotifKey[r.id]) {
              await push(notifRef, {
                title: 'Parking Spot Nearby',
                body:
                  r.userId === user.uid
                    ? 'You reported this spot.'
                    : 'A new spot opened near you.',
                markerId: r.id,
                timestamp: Date.now(),
              });
            }

            // Push notification once when entering radius
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '🚗 Parking Spot Detected',
                body:
                  r.userId === user.uid
                    ? 'You reported this spot.'
                    : 'A new parking spot opened near you!',
                data: { markerId: r.id },
              },
              trigger: null,
            });
          }
        }
      }

      if (cancelled) return;

      // 2) Markers that LEFT radius (were in old set, not in new set) → remove DB notification
      const leftIds = [...inRadiusRef.current].filter(
        id => !inRadiusNow.has(id)
      );

      for (const mId of leftIds) {
        const notifKey = markerIdToNotifKey[mId];
        if (notifKey) {
          await remove(ref(database, `users/${user.uid}/notifications/${notifKey}`));
        }
      }

      // 3) Update our in-radius tracker for next diff
      inRadiusRef.current = inRadiusNow;
    })();

    return () => {
      cancelled = true;
    };
  }, [parkingReports, userLocation, radius, notificationsEnabled]);

  // Recenter when coming from Notifications screen
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
    const user = auth.currentUser;
    if (!user) return;

    // Get user's current GPS location
    const currentLoc = await Location.getCurrentPositionAsync({});
    const userLat = currentLoc.coords.latitude;
    const userLon = currentLoc.coords.longitude;

    if (!region) {
      Alert.alert('Error', 'Map region not ready yet.');
      return;
    }

    // Distance between map center and your actual location
    const dist = getDistance(
      region.latitude,
      region.longitude,
      userLat,
      userLon
    );

    // Prevent reporting too far from actual location
    if (dist > 0.5) {
      Alert.alert(
        'Out of range',
        'You can only report parking spots within 0.5 miles of your current location.'
      );
      return;
    }

    // Add parking report to database
    const reportRef = push(ref(database, 'parkingReports'));
    await set(reportRef, {
      latitude: region.latitude,
      longitude: region.longitude,
      isAvailable: available,
      timestamp: serverTimestamp(),
      userId: user.uid,
    });

    // Update lifetime analytics
    const analyticsRef = ref(database, `users/${user.uid}/analytics`);
    const snapshot = await get(analyticsRef);
    const prev = snapshot.exists()
      ? snapshot.val()
      : { total: 0, available: 0, unavailable: 0 };

    const updated = {
      total: (prev.total || 0) + 1,
      available: (prev.available || 0) + (available ? 1 : 0),
      unavailable: (prev.unavailable || 0) + (!available ? 1 : 0),
    };

    await set(analyticsRef, updated);

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
            onPress={async () => {
              if (addFavsBtn) {
                let newKey = addBtnKey + 1;
                setAddBtnKey(newKey);
                setAddFavsBtn(false);
                navigation.navigate('Settings', { 
                  longitude: r.longitude,
                  latitude: r.latitude,
                  addBtnKey: newKey,
                });
              } else {
                const currentLoc = await Location.getCurrentPositionAsync({});
                const dist = getDistance(
                  currentLoc.coords.latitude,
                  currentLoc.coords.longitude,
                  r.latitude,
                  r.longitude
                );

                if (dist > 0.5) {
                  Alert.alert('Too Far', 'You can only modify or delete spots within 0.5 miles of your location.');
                  return;
                }

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
                ]);
              }
            }}
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

      {/*add favs btn */}
      <TouchableOpacity style={ addFavsBtn ? styles.favsBtnEnabled :styles.favsBtn}
      onPress={() => setAddFavsBtn(prev => !prev)}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Fav</Text>
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

            {[0.5, 1, 5].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.modalBtn, radius === v ? styles.greenBtn : styles.redBtn]}
                onPress={() => {
                  const user = auth.currentUser;
                  setRadius(v);
                  if (user) {
                    set(ref(database, `users/${user.uid}/radius`), v);
                  }
                  setRadiusModalVisible(false);
                }}
              >
                <Text style={styles.btnText}>{v} mile{v > 1 ? 's' : ''}</Text>
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
    bottom: 150,
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
  favsBtn: { 
    position: 'absolute',
    bottom: 95, right: 20, 
    backgroundColor: '#FFA500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5
  },
  favsBtnEnabled: {     
    position: 'absolute',
    bottom: 95, right: 20, 
    backgroundColor: '#48ff00ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5 
  },
});
