import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  SafeAreaView, ScrollView, StatusBar, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const NOUN_GREEN = '#006600';
const NOUN_LIGHT_GREEN = '#e8f5e9';

export default function CourseDetails() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`https://noun-study-buddy.onrender.com/api/courses/${id}/`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  }, [id]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={NOUN_GREEN} /></SafeAreaView>;

  // Smart Level Logic
  const courseCode = courseData?.code || '';
  const firstDigit = courseCode.match(/\d/); 
  const isPOP = firstDigit && parseInt(firstDigit[0], 10) >= 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.courseCode}>{courseData?.code}</Text>
        <Text style={styles.courseTitle}>{courseData?.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.promptText}>What would you like to do?</Text>

        {/* 1. Summary */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/summary/${id}` as any)}>
          <View style={styles.iconCircle}><Text style={{fontSize: 24}}>📖</Text></View>
          <View><Text style={styles.actionTitle}>Read Summary</Text></View>
        </TouchableOpacity>

        {/* 2. FIX: Questions and Answers (NO TIMER / NO BEGIN EXAM) */}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push(`/mock/${id}?mode=study` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#e3f2fd'}]}>
            <Text style={{fontSize: 24}}>💡</Text>
          </View>
          <View>
            <Text style={styles.actionTitle}>Questions and Answers</Text>
            <Text style={{fontSize: 12, color: '#666'}}>Study Mode • Answers revealed</Text>
          </View>
        </TouchableOpacity>

        {/* 3. FIX: Timed Mock (HAS TIMER / HAS BEGIN EXAM) */}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push(`/mock/${id}?mode=exam&format=${isPOP ? 'POP' : 'CBT'}` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#fff3e0'}]}>
            <Text style={{fontSize: 24}}>⏱️</Text>
          </View>
          <View>
            <Text style={styles.actionTitle}>Take Timed Mock Exam</Text>
            <Text style={{fontSize: 12, color: '#666'}}>{isPOP ? 'POP Format' : 'CBT Format'}</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, backgroundColor: NOUN_GREEN, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50 },
  backText: { color: 'white', fontWeight: 'bold' },
  courseCode: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  courseTitle: { color: '#e0e0e0', fontSize: 16 },
  content: { padding: 20 },
  promptText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  actionCard: { backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: NOUN_LIGHT_GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' }
});