// screens/NotificationsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import * as Location from 'expo-location';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// SAME UW_AREAS AS IN MapScreen
const UW_AREAS = [
  {
    key: "engineering",
    name: "Engineering Campus",
    latitude: 43.0726,
    longitude: -89.4060,
    radius: 0.4,
  },
  {
    key: "bascom",
    name: "Bascom Hill",
    latitude: 43.0757,
    longitude: -89.4041,
    radius: 0.4,
  },
  {
    key: "unionSouth",
    name: "Union South",
    latitude: 43.0711,
    longitude: -89.4075,
    radius: 0.4,
  },
  {
    key: "terrace",
    name: "Memorial Union Terrace",
    latitude: 43.0762,
    longitude: -89.3995,
    radius: 0.4,
  },
  {
    key: "campRandall",
    name: "Camp Randall",
    latitude: 43.0690,
    longitude: -89.4125,
    radius: 0.5,
  },
  {
    key: "lakeshore",
    name: "Lakeshore Dorms",
    latitude: 43.0795,
    longitude: -89.4050,
    radius: 0.5,
  },
  {
    key: "stateStreet",
    name: "State Street / Library Mall",
    latitude: 43.0736,
    longitude: -89.3970,
    radius: 0.35, 
  },  
  {
    key: "capitol",
    name: "State Capitol Square",
    latitude: 43.0747,
    longitude: -89.3842,
    radius: 0.35,
  },
];

// SAME DISTANCE FUNCTION AS MapScreen (miles)
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

// Format timestamp into readable date/time
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function NotificationsScreen() {
  const user = auth.currentUser;
  const navigation = useNavigation();

  const [parkingReports, setParkingReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(0.3);
  const [areaFilter, setAreaFilter] = useState(null);

  // Listen to radius + areaFilter in REAL TIME so changes on MapScreen sync here
  useEffect(() => {
    if (!user) return;

    const radiusRef = ref(database, `users/${user.uid}/radius`);
    const areaRef = ref(database, `users/${user.uid}/areaFilter`);

    const unsubRadius = onValue(radiusRef, snap => {
      if (snap.exists()) {
        setRadius(snap.val());
      }
    });

    const unsubArea = onValue(areaRef, snap => {
      if (snap.exists()) {
        setAreaFilter(snap.val());
      } else {
        setAreaFilter(null);
      }
    });

    return () => {
      unsubRadius();
      unsubArea();
    };
  }, [user]);

  // Get user location (similar to MapScreen, so radius filter matches)
  useEffect(() => {
    let subscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied for NotificationsScreen.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // keep it updated like MapScreen
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        loc2 => {
          setUserLocation({
            latitude: loc2.coords.latitude,
            longitude: loc2.coords.longitude,
          });
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Listen to parking reports in real time (same freshness as MapScreen)
  useEffect(() => {
    const reportsRef = ref(database, 'parkingReports');
    const unsubscribe = onValue(reportsRef, snapshot => {
      const data = snapshot.val() || {};
      const arr = Object.keys(data).map(id => ({ id, ...data[id] }));

      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;

      const freshReports = arr.filter(r => {
        if (!r.timestamp) return true;
        return now - r.timestamp <= TWO_HOURS;
      });

      setParkingReports(freshReports);
    });

    return () => unsubscribe();
  }, []);

  // Apply EXACT same filtering as MapScreen
  const filteredReports = parkingReports.filter(r => {
    // CASE 1: Show all areas but respect user radius
    if (!areaFilter) {
      if (!userLocation) return false; // don't show until we know where user is
      const distUser = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        r.latitude,
        r.longitude
      );
      return distUser <= radius;
    }

    // CASE 2: Specific area selected
    const area = UW_AREAS.find(a => a.key === areaFilter);
    if (!area) return true;

    const distArea = getDistance(area.latitude, area.longitude, r.latitude, r.longitude);
    return distArea <= area.radius;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Recent Notifications</Text>

      {filteredReports.length === 0 && (
        <Text style={styles.noItems}>
          No spots match your current radius/area filter.
        </Text>
      )}

      {filteredReports.map(r => {
        let distanceText = '';
        if (userLocation) {
          const d = getDistance( // calc distance of report from user
            userLocation.latitude,
            userLocation.longitude,
            r.latitude,
            r.longitude
          );
          distanceText = `${d.toFixed(2)} miles away`;
        }

        return (
          <TouchableOpacity
            key={r.id}
            style={styles.historyRow}
            onPress={() => navigation.navigate('Map', { markerId: r.id })}
          >
            <Text style={styles.historyTitle}>
              {r.isAvailable ? 'Available spot' : 'Unavailable spot'}
            </Text>

            {!!distanceText && (
              <Text style={styles.historyBody}>{distanceText}</Text>
            )}

            {r.timestamp && (
              <Text style={styles.timeAgo}>{formatDate(r.timestamp)}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  header: { fontSize: 28, fontWeight: "bold", marginVertical: 20, marginTop: 20, top: 20 },
  historyRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  historyTitle: { fontSize: 18, fontWeight: "600" },
  historyBody: { fontSize: 14, color: "#666", marginTop: 4 },
  timeAgo: { fontSize: 12, color: '#999', marginTop: 2 },
  noItems: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
});
