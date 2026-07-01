import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

export default function PlannerScreen() {
  const { colors } = useTheme();
  const { isLoggedIn, token } = useAuth();
  const router = useRouter();

  const [schedules, setSchedules] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [examDate, setExamDate] = useState('');

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Token ${token}` };
      
      // Fetch schedules
      const schedRes = await fetch(`${BASE_URL}/api/planner/`, { headers });
      const schedData = await schedRes.json();
      setSchedules(schedData.schedules || []);

      // Fetch user's purchased courses (or all for now) to populate dropdown
      const courseRes = await fetch(`${BASE_URL}/api/courses/`);
      const courseData = await courseRes.json();
      setCourses(courseData || []);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchData();
    }
  }, [isLoggedIn, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const addSchedule = async () => {
    if (!selectedCourseId || !examDate) {
      Alert.alert('Error', 'Please enter a course code and valid date (YYYY-MM-DD)');
      return;
    }

    // Find course ID by code
    const course = courses.find(c => c.code.toLowerCase() === selectedCourseId.toLowerCase());
    if (!course) {
      Alert.alert('Error', 'Course not found. Please enter a valid course code (e.g. MTH101)');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${BASE_URL}/api/planner/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          course_id: course.id,
          exam_date: examDate
        })
      });
      setShowForm(false);
      setExamDate('');
      setSelectedCourseId('');
      fetchData(); // Reload
    } catch (e) {
      Alert.alert('Error', 'Failed to save schedule');
      setLoading(false);
    }
  };

  const deleteSchedule = async (id: number) => {
    setLoading(true);
    try {
      await fetch(`${BASE_URL}/api/planner/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ id })
      });
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete');
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.headerTitle}>📅 Study Planner</Text>
        </View>
        <View style={styles.centerBody}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🔒</Text>
            <Text style={[styles.title, { color: colors.text }]}>Login Required</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Log in to set exam dates, get daily study goals, and track your countdowns!
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/auth/login' as any)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>📅 Study Planner</Text>
        <Text style={styles.headerSub}>Manage your exam countdowns</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBody}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Action Header */}
          <View style={styles.actionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Upcoming Exams</Text>
            <TouchableOpacity onPress={() => setShowForm(!showForm)}>
              <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 16 }}>
                {showForm ? 'Cancel' : '+ Add Exam'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          {showForm && (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontWeight: 'bold' }}>Course Code:</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} 
                placeholder="e.g. MTH101" 
                placeholderTextColor={colors.textMuted}
                value={selectedCourseId}
                onChangeText={setSelectedCourseId}
              />
              <Text style={{ color: colors.textSecondary, marginBottom: 8, marginTop: 12, fontWeight: 'bold' }}>Exam Date:</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} 
                placeholder="YYYY-MM-DD" 
                placeholderTextColor={colors.textMuted}
                value={examDate}
                onChangeText={setExamDate}
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={addSchedule}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List of Schedules */}
          {schedules.length === 0 && !showForm ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 50, marginBottom: 12 }}>🗓️</Text>
              <Text style={[styles.title, { color: colors.text }]}>No exams scheduled</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>
                Add your upcoming exam dates to see a live countdown and generate a daily study plan.
              </Text>
            </View>
          ) : (
            schedules.map((s, i) => (
              <View key={i} style={[styles.schedCard, { backgroundColor: colors.card }]}>
                <View style={styles.schedHeader}>
                  <View>
                    <Text style={[styles.schedCode, { color: colors.text }]}>{s.course_code}</Text>
                    <Text style={[styles.schedDate, { color: colors.textMuted }]}>{s.exam_date}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteSchedule(s.id)}>
                    <Text style={{ color: colors.error, fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.countdownBox, { backgroundColor: s.days_left <= 7 ? colors.errorLight : colors.accentLight }]}>
                  <Text style={[styles.countdownNum, { color: s.days_left <= 7 ? colors.error : colors.accent }]}>
                    {s.days_left}
                  </Text>
                  <Text style={[styles.countdownText, { color: s.days_left <= 7 ? colors.error : colors.accent }]}>
                    Days Remaining
                  </Text>
                </View>

                {/* Simulated Daily Plan Feature */}
                <View style={[styles.planBox, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Suggested today:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
                    <Text style={{ color: colors.text, flex: 1, fontSize: 14 }}>
                      {s.days_left > 14 ? 'Read Summary Chapter 1' : s.days_left > 3 ? 'Take 2 Mock Exams' : 'Review Weak Areas'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  centerBody: { flex: 1, padding: 20, justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  card: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3, marginTop: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  desc: { textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },

  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },

  formCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, fontSize: 16 },
  saveBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },

  schedCard: { borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  schedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  schedCode: { fontSize: 20, fontWeight: 'bold' },
  schedDate: { fontSize: 14, marginTop: 2 },
  
  countdownBox: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  countdownNum: { fontSize: 36, fontWeight: 'bold' },
  countdownText: { fontSize: 14, fontWeight: 'bold', marginTop: -4 },

  planBox: { borderTopWidth: 1, paddingTop: 12 },
});
