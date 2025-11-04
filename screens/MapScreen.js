import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { database, auth } from '../firebaseConfig';
import { ref, push, serverTimestamp, onValue, remove } from 'firebase/database';

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [parkingReports, setParkingReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const mapRef = useRef(null);

  // Get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // Listen to parking reports from Firebase
  useEffect(() => {
    const reportsRef = ref(database, 'parkingReports');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reportsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setParkingReports(reportsArray);
      } else {
        setParkingReports([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const reportParking = async (isAvailable) => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    try {
      const reportsRef = ref(database, 'parkingReports');
      await push(reportsRef, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        isAvailable: isAvailable,
        reportedBy: auth.currentUser?.email || 'Anonymous',
        timestamp: Date.now(),
      });

      Alert.alert('Success', `Parking ${isAvailable ? 'available' : 'unavailable'} reported!`);
      setReportModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteReport = (reportId, reportedBy) => {
    if (reportedBy !== auth.currentUser?.email) {
      return;
    }

    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const reportRef = ref(database, `parkingReports/${reportId}`);
            await remove(reportRef);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      Keyboard.dismiss();
      
      // Use Google Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery + ' Madison WI'
        )}&key=AIzaSyCC_SBqPpC9sv-cKC2LzOgROtkzHys7xuY`
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        
        // Animate to searched location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }

        setSearchVisible(false);
        setSearchQuery('');
      } else {
        Alert.alert('Not Found', 'Location not found. Try another search.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search location');
      console.error(error);
    }
  };

  // Filter reports based on selected filter
  const filteredReports = parkingReports.filter((report) => {
    if (filter === 'available') return report.isAvailable;
    if (filter === 'unavailable') return !report.isAvailable;
    return true;
  });

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'available' && styles.filterButtonActive]}
          onPress={() => setFilter('available')}
        >
          <Text style={[styles.filterButtonText, filter === 'available' && styles.filterButtonTextActive]}>
            ✓ Available
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'unavailable' && styles.filterButtonActive]}
          onPress={() => setFilter('unavailable')}
        >
          <Text style={[styles.filterButtonText, filter === 'unavailable' && styles.filterButtonTextActive]}>
            ✗ Unavailable
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Button */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => setSearchVisible(true)}
      >
        <Text style={styles.searchButtonText}>🔍</Text>
      </TouchableOpacity>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
      >
        {filteredReports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            pinColor={report.isAvailable ? 'green' : 'red'}
            title={report.isAvailable ? '✓ Parking Available' : '✗ Parking Unavailable'}
            description={`${getTimeAgo(report.timestamp)}\nReported by: ${report.reportedBy}`}
            onCalloutPress={() => {
              if (report.reportedBy === auth.currentUser?.email) {
                deleteReport(report.id, report.reportedBy);
              }
            }}
          />
        ))}
      </MapView>

      {/* Report Button */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setReportModalVisible(true)}
      >
        <Text style={styles.reportButtonText}>Report Parking</Text>
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Parking Status</Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => reportParking(true)}
            >
              <Text style={styles.modalButtonText}>✓ Available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#F44336' }]}
              onPress={() => reportParking(false)}
            >
              <Text style={styles.modalButtonText}>✗ Unavailable</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setReportModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={searchVisible}
        onRequestClose={() => setSearchVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Search Location</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Enter location (e.g. Memorial Union)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
              onPress={handleSearch}
            >
              <Text style={styles.modalButtonText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSearchVisible(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 1,
  },
  filterButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  searchButton: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  searchButtonText: {
    fontSize: 24,
  },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});