// screens/NotificationsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

export default function NotificationsScreen() {
  const user = auth.currentUser;
  const [history, setHistory] = useState([]);

  // convert timestamp to "x minutes ago"
  function timeAgo(ts) {
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 minute ago";
    return `${mins} minutes ago`;
  }

  // load history
  useEffect(() => {
    if (!user) return;
    const histRef = ref(database, `users/${user.uid}/notifications`);
    onValue(histRef, snap => {
      if (!snap.exists()) return;
      const data = snap.val();
      const arr = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      arr.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(arr);
    });
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Recent Notifications</Text>

      {history.length === 0 && (
        <Text style={styles.noItems}>No notifications yet.</Text>
      )}

      {history.map(item => (
        <View key={item.id} style={styles.historyRow}>
          <Text style={styles.historyTitle}>{item.title}</Text>
          <Text style={styles.historyBody}>{item.body}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.timestamp)}</Text>
        </View>
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
