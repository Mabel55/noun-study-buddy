import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  ScrollView,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const NOUN_GREEN = '#006600';

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
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={NOUN_GREEN} />
      </SafeAreaView>
    );
  }

  // 🚀 NOUN LEVEL LOGIC
  const courseCode = courseData?.code || '';
  const firstDigitMatch = courseCode.match(/\d/); 
  const isPOPLevel = firstDigitMatch && parseInt(firstDigitMatch[0], 10) >= 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.courseCode}>{courseData?.code}</Text>
        <Text style={styles.courseTitle}>{courseData?.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.promptText}>What would you like to do?</Text>

        {/* 1. SUMMARY BUTTON */}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push(`/summary/${id}` as any)}
        >
          <View style={styles.iconCircle}><Text style={styles.actionIcon}>📖</Text></View>
          <View>
            <Text style={styles.actionTitle}>Read Course Summary</Text>
            <Text style={styles.actionSub}>Quick notes and key points</Text>
          </View>
        </TouchableOpacity>

        {/* 2. QUESTIONS & ANSWERS (STUDY MODE) */}
        {/* This mode has NO timer and shows all multiple choice options */}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push(`/mock/${id}?mode=study` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#e3f2fd'}]}>
            <Text style={styles.actionIcon}>💡</Text>
          </View>
          <View>
            <Text style={styles.actionTitle}>Questions and Answers</Text>
            <Text style={styles.actionSub}>Study mode • No timer</Text>
          </View>
        </TouchableOpacity>

        {/* 3. TIMED MOCK EXAM (EXAM MODE) */}
        {/* This mode HAS a timer and follows NOUN level rules */}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push(`/mock/${id}?mode=exam&format=${isPOPLevel ? 'POP' : 'CBT'}` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#fff3e0'}]}>
            <Text style={styles.actionIcon}>⏱️</Text>
          </View>
          <View>
            <Text style={styles.actionTitle}>Take Timed Mock Exam</Text>
            <Text style={styles.actionSub}>
              {isPOPLevel ? 'POP Format (Theory/Fill)' : 'CBT Format (MCQ/Fill)'}
            </Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    padding: 24, 
    backgroundColor: NOUN_GREEN, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    paddingTop: 50 
  },
  backButton: { marginBottom: 15 },
  backText: { color: 'white', fontSize: 16, fontWeight: '600' },
  courseCode: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  courseTitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { padding: 20 },
  promptText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  actionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f4f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  actionIcon: { fontSize: 24 },
  actionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  actionSub: { fontSize: 13, color: '#666', marginTop: 2 }
});