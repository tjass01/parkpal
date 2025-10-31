import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { database } from '../firebaseConfig';
import { ref, push, serverTimestamp, onValue } from 'firebase/database';

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [parkingReports, setParkingReports] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  useEffect(() => {
    const parkingRef = ref(database, 'parkingReports');
    const unsubscribe = onValue(parkingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reports = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setParkingReports(reports);
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
      const parkingRef = ref(database, 'parkingReports');
      await push(parkingRef, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        isAvailable: isAvailable,
        timestamp: serverTimestamp(),
      });

      Alert.alert('Success', `Parking ${isAvailable ? 'available' : 'unavailable'} reported!`);
      setReportModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to report parking: ' + error.message);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
      >
        {parkingReports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            pinColor={report.isAvailable ? 'green' : 'red'}
            title={report.isAvailable ? 'Parking Available' : 'Parking Unavailable'}
          />
        ))}
      </MapView>

      {/* Profile Button - Top Right */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileButtonText}>👤</Text>
      </TouchableOpacity>

      {/* Floating Report Button - Bottom Right */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setReportModalVisible(true)}
      >
        <Text style={styles.reportButtonText}>Report</Text>
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Parking Status</Text>
            
            {location && (
              <Text style={styles.locationText}>
                Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.availableButton]}
              onPress={() => reportParking(true)}
            >
              <Text style={styles.buttonText}>Parking Available ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.unavailableButton]}
              onPress={() => reportParking(false)}
            >
              <Text style={styles.buttonText}>Parking Unavailable ✗</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  profileButton: {
    position: 'absolute',
    top: 50,
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
  },
  profileButtonText: {
    fontSize: 24,
  },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  availableButton: {
    backgroundColor: '#4CAF50',
  },
  unavailableButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});