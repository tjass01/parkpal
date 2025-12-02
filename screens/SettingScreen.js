import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { auth, database } from '../firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ref, update, get} from 'firebase/database';

export default function SettingsScreen() {
  const route = useRoute();
  const { longitude, latitude, addBtnKey } = route.params || {};

  const [pushEnabled, setPushEnabled] = useState(true);
  const [spotAlertEnabled, setSpotAlertEnabled] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLotName, setNewLotName] = useState('');

  const user = auth.currentUser;
  const favKey = `favorites_${user.uid}`;
  const loadedRef = useRef(false);
  const navigation = useNavigation();

  // load settings and favorites
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // retrieve push notification setting from Firebase to load as user preference
        const storedPush = await get(ref(database, `users/${user.uid}/notificationsEnabled`))
        if (storedPush.exists()){
          setPushEnabled(storedPush.val());
        }

        const storedSpot = await SecureStore.getItemAsync('spotAlertEnabled');
        const storedFavs = await SecureStore.getItemAsync(favKey);

        //if (storedPush !== null) setPushEnabled(JSON.parse(storedPush));
        if (storedSpot !== null) setSpotAlertEnabled(JSON.parse(storedSpot));
        if (storedFavs !== null) setFavorites(JSON.parse(storedFavs));

        loadedRef.current = true;
        console.log('Settings loaded',JSON.stringify(storedFavs) );
      } catch (e) {
        console.log('Error loading settings:', e);
      }
    };
    loadSettings();
  }, [favKey]);


  useEffect( () => {
    if (!loadedRef.current) return;
       SecureStore.setItemAsync('spotAlertEnabled', JSON.stringify(spotAlertEnabled));
  }, [spotAlertEnabled]);

  // save favorites whenever list is updated
  useEffect( () => {
    if (!loadedRef.current) return;

    const saveFavorites = async () => {
      try {
        await SecureStore.setItemAsync(favKey, JSON.stringify(favorites));
      } catch (e) {
        console.log('Error saving favorites:', e);
      }
    };

  saveFavorites();
  }, [favorites, favKey]);

  // show modal if navigated with longitude & latitude
  useEffect(() => {
    if (latitude && longitude) {
      setModalVisible(true);
    }
  }, [latitude, longitude, addBtnKey]);


  // add favorite lot
  const addFavorite = () => {
    if (!newLotName.trim()) return; 
    const newFav = {
      name: newLotName.trim(),
      latitude,
      longitude,
    };

    setFavorites([...favorites, newFav]);
    setNewLotName('');
    setModalVisible(false);
  };

  // remove favorite lot
  const removeFavorite = (name) => {
    setFavorites(favorites.filter((f) => f.name !== name));
  };

  // navigate to favorite lot on map
  const goToFavLot = (fav) => {
    //Alert.alert(`Navigating to favorite lot: ${fav.latitude}, ${fav.longitude}`);
    navigation.navigate('Map', {
      goFavLat: fav.latitude,
      goFavLng: fav.longitude,
      fromFavorites: true,
    })
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* header */}
        <Text style={styles.header}>⚙️ Settings</Text>

        {/* notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Push Notifications</Text>
            <Switch
              value={pushEnabled}

              
              onValueChange={ async (value) => {
                
                setPushEnabled(value);
                if (user){
                  await update(ref(database, `users/${user.uid}`),{
                    notificationsEnabled: value
                  });
                }
              }
            }
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

        {/* favorites Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Lots</Text>
          {
          favorites.map((fav) => (
            <View key={fav.name} style={styles.tag}>

              {/* lot  */}
              <TouchableOpacity onPress={() => goToFavLot(fav)}>
                <Text style={styles.tagText}>{fav.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeFavorite(fav.name)}>
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* modal for adding favorite */}
        <Modal transparent visible={modalVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Favorite Lot</Text>
              <TextInput
                placeholder="Enter lot name"
                style={styles.input}
                value={newLotName}
                onChangeText={setNewLotName}
              />
              <TouchableOpacity style={styles.addConfirmBtn} onPress={addFavorite}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* footer */}
        <Text style={styles.footer}>Version 1.0 • ParkPal Team</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { padding: 25, paddingBottom: 40 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginBottom: 25 },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
  sectionTitle: { fontSize: 14, color: '#777', fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 16, color: '#333' },
  tag: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, marginBottom: 10 },
  tagText: { fontSize: 16, color: '#000' },
  remove: { fontSize: 22, color: '#888' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: 'white', marginHorizontal: 30, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12 },
  addConfirmBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 6 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { backgroundColor: '#F44336', padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  footer: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 },
});
