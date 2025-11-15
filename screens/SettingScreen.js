import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [spotAlertEnabled, setSpotAlertEnabled] = useState(false);
  const [favorites, setFavorites] = useState(['Engineering Hall', 'Union South']);
  const [newLot, setNewLot] = useState('');
  const [adding, setAdding] = useState(false);

  const addFavorite = () => {
    if (!newLot.trim()) {
      Alert.alert('Enter lot name', 'Lot name must not be empty.');
      return;
    }
    if (favorites.includes(newLot.trim())) {
      Alert.alert('Already added', 'This lot is already in your favorites.');
      return;
    }
    setFavorites([...favorites, newLot.trim()]);
    setNewLot('');
    setAdding(false);
  };

  const removeFavorite = (name) => {
    setFavorites(favorites.filter((lot) => lot !== name));
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.header}>⚙️ Settings</Text>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Push Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
              thumbColor={pushEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Spot Opened Alerts</Text>
            <Switch
              value={spotAlertEnabled}
              onValueChange={setSpotAlertEnabled}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
              thumbColor={spotAlertEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Favorite Lots Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Lots</Text>

          {favorites.map((lot) => (
            <View key={lot} style={styles.tag}>
              <Text style={styles.tagText}>{lot}</Text>
              <TouchableOpacity onPress={() => removeFavorite(lot)}>
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {adding ? (
            <View style={styles.addInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter lot name"
                placeholderTextColor="#888"
                value={newLot}
                onChangeText={setNewLot}
              />
              <TouchableOpacity style={styles.addConfirmBtn} onPress={addFavorite}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAdding(true)}
            >
              <Text style={styles.addLotText}>+ Add Favorite Lot</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Version 1.0 • ParkPal Team</Text>
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
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  tag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 16,
    color: '#000',
  },
  remove: {
    fontSize: 22,
    color: '#888',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aaa',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 5,
  },
  addLotText: {
    fontSize: 16,
    color: '#666',
  },
  addInputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
  },
  addConfirmBtn: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelText: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 10,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 10,
  },
});
