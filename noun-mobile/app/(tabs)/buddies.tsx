import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

export default function BuddiesScreen() {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  
  const [matches, setMatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    Promise.all([
      fetch(`${BASE_URL}/api/buddies/`, { headers: { 'Authorization': `Token ${token}` } }).then(res => res.json()),
      fetch(`${BASE_URL}/api/courses/`).then(res => res.json())
    ])
    .then(([m, c]) => {
      setMatches(m.results || m);
      setCourses(c.results || c);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  const requestMatch = async (courseId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/buddies/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ course_id: courseId })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success!', 'We found a study buddy for you!');
        // Refresh matches
        const matchesRes = await fetch(`${BASE_URL}/api/buddies/`, { headers: { 'Authorization': `Token ${token}` } });
        const m = await matchesRes.json();
        setMatches(m.results || m);
      } else {
        Alert.alert('Match failed', data.error || 'No buddies available right now.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const filteredCourses = courses.filter((c: any) => c.code.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!token) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text>
        <Text style={{ color: colors.text, fontSize: 18 }}>Please log in to find Study Buddies</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>👥 Study Buddies</Text>
        <Text style={styles.headerSub}>Learn together and stay accountable</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Active Matches</Text>
        {matches.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active matches yet.</Text>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginBottom: 20 }}
            renderItem={({ item }) => {
              const buddyName = item.user1_username === user?.username ? item.user2_username : item.user1_username;
              return (
                <TouchableOpacity 
                  style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/buddies/chat/${item.id}` as any)}
                >
                  <View style={styles.avatar}><Text style={{fontSize: 24}}>👤</Text></View>
                  <Text style={[styles.matchCourse, { color: colors.accent }]}>{item.course_code}</Text>
                  <Text style={[styles.matchName, { color: colors.text }]}>{buddyName}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>Find a Buddy by Course</Text>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Search course code (e.g. MTH101)"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <FlatList
          data={filteredCourses}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.courseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.courseCode, { color: colors.text }]}>{item.code}</Text>
                <Text style={[styles.courseTitle, { color: colors.textSecondary }]} numberOfLines={1}>{item.title}</Text>
              </View>
              <TouchableOpacity style={[styles.matchBtn, { backgroundColor: colors.accent }]} onPress={() => requestMatch(item.id)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Find Buddy</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { fontStyle: 'italic', marginBottom: 20 },
  
  matchCard: { width: 120, padding: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  matchCourse: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  matchName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  
  searchInput: { padding: 12, borderRadius: 12, marginBottom: 15, fontSize: 16 },
  
  courseRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  courseCode: { fontSize: 16, fontWeight: 'bold' },
  courseTitle: { fontSize: 12, marginTop: 2 },
  matchBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }
});
