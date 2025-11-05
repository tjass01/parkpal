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
} from 'react-native';

export default function SettingsScreen() {

  // TODO add local storage functionality to save favs
  // TODO hook up setting switches to permissions
  // TODO when saving locations ensure lng lat are saved as to connect with a marker on map
  // TODO remove notifications switch from profile screen, discuss with partner due to database changes

  const [pushEnabled, setPushEnabled] = useState(false);
  const [spotAlertEnabled, setSpotAlertEnabled] = useState(false);

  // set fav lots; Engineering Hall and Union South for Demo UI
  const [favorites, setFavorites] = useState([
    'Engineering Hall',
    'Union South',
  ]);
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

  // remove lot from favs
  const removeFavorite = (name) => {
    setFavorites(favorites.filter((lot) => lot !== name));
  };

  return (
    <ScrollView style={styles.container}>

      {/* header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
      </View>

      {/* notifications  */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        {/* push */}
        <View style={styles.row}>
          <Text style={styles.label}>Push Notifications</Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
        </View>

        {/* spot opened alert */}
        <View style={styles.row}>
          <Text style={styles.label}>Spot Opened Alerts</Text>
          <Switch
            value={spotAlertEnabled}
            onValueChange={setSpotAlertEnabled}
          />
        </View>
      </View>

      {/* location permissions */}
      

      {/* favorite lots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAVORITE LOTS</Text>

        {
        favorites.map((lot) => (
          <View key={lot} style={styles.tag}>
            <Text style={styles.tagText}>{lot}</Text>
            <TouchableOpacity onPress={() => removeFavorite(lot)}>
              <Text style={styles.remove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {
        adding ? (
          <View style={styles.addInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter lot name"
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
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
  },
  tag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 16,
  },
  remove: {
    fontSize: 20,
    color: '#888',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aaa',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  addInputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    paddingVertical: 6,
    fontSize: 16,
  },
  addConfirmBtn: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  cancelText: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  addLotText:{
    fontSize:16,
    color: '#666'
  }
});
