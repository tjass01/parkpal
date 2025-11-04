import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Switch } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editing, setEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Load user data
  useEffect(() => {
    if (!user) return;
    const userRef = ref(database, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setNotificationsEnabled(data.notificationsEnabled ?? true);
      }
    });
  }, [user]);

  // Save updated profile
  const handleSave = async () => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        firstName,
        lastName,
        notificationsEnabled,
        email: user.email,
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Success', 'Logged out successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        editable={editing}
        onPressIn={() => setEditing(true)}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        editable={editing}
        onPressIn={() => setEditing(true)}
        onChangeText={setLastName}
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={(value) => {
            setNotificationsEnabled(value);
            setEditing(true);
          }}
        />
      </View>

      {editing && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginTop: 50, marginBottom: 30 },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  value: { fontSize: 18, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleLabel: { fontSize: 18 },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
