// screens/NotificationsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const user = auth.currentUser;
  const [history, setHistory] = useState([]);
  const navigation = useNavigation();

  // Format timestamp into readable date/time
  function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

//Load notifications but only those created AFTER the user's last login.
  useEffect(() => {
    if (!user) return;
    const lastLoginRef = ref(database, `users/${user.uid}/lastLogin`); // Reference to user’s last login timestamp in Firebase
    const notifRef = ref(database, `users/${user.uid}/notifications`); // Reference to all notifications for this user
    onValue(lastLoginRef, loginSnap => { // Listen for lastLogin changes
      if (!loginSnap.exists()) return;
      const lastLogin = loginSnap.val();
      onValue(notifRef, notifSnap => { // Listen for notification updates in real-time
        if (!notifSnap.exists()) return;
  
        const data = notifSnap.val();
        const arr = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        const filtered = arr.filter(n => n.timestamp >= lastLogin); // Only include notifications newer than lastLogin
        filtered.sort((a, b) => b.timestamp - a.timestamp); // Sort newest -> oldest
  
        setHistory(filtered);
      });
    });
  }, [user]);
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Recent Notifications</Text>

      {history.length === 0 && (
        <Text style={styles.noItems}>No notifications yet.</Text>
      )}

      {history.map(item => (
        <TouchableOpacity
        key={item.id}
        style={styles.historyRow}
        onPress={() => {
          if (item.markerId) {
            navigation.navigate("Map", { markerId: item.markerId });
          }
        }}
      >      
          <Text style={styles.historyTitle}>{item.title}</Text>
          <Text style={styles.historyBody}>{item.body}</Text>
          <Text style={styles.timeAgo}>{formatDate(item.timestamp)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  header: { fontSize: 28, fontWeight: "bold", marginVertical: 20, top:20 },
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
