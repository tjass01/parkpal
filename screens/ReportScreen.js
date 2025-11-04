import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';

export default function ReportScreen() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const reportParking = (isAvailable) => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    // TODO: Save in Firebase
    Alert.alert(
      'Success',
      `Parking ${isAvailable ? 'available' : 'unavailable'} reported at your location`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Report Parking Status</Text>
      
      {location && (
        <Text style={styles.locationText}>
          Current Location: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, styles.availableButton]}
        onPress={() => reportParking(true)}
      >
        <Text style={styles.buttonText}>Parking Available ✓</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.unavailableButton]}
        onPress={() => reportParking(false)}
      >
        <Text style={styles.buttonText}>Parking Unavailable ✗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  button: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
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
});