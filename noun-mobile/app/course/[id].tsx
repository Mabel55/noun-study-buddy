import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function CourseDetails() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://noun-study-buddy.onrender.com/api/courses/${id}/`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.courseCode}>{courseData?.code}</Text>
        <Text style={styles.courseTitle}>{courseData?.title}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.promptText}>What would you like to do?</Text>

        {/* 1. Summary Button */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/summary/${id}` as any)}>
          <Text style={styles.actionIcon}>📖</Text>
          <Text style={styles.actionText}>Read Summary</Text>
        </TouchableOpacity>

        {/* 2. Questions and Answers Button (For POP essays) */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/mock/${id}?format=POP` as any)}>
          <Text style={styles.actionIcon}>💡</Text>
          <Text style={styles.actionText}>Questions and Answers</Text>
        </TouchableOpacity>

        {/* 3. Mock Exam Button (For CBT) */}
<TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/exam/${id}` as any)}>
  <Text style={styles.actionIcon}>⏱️</Text>
  <Text style={styles.actionText}>Take Timed Mock Exam</Text>
</TouchableOpacity>
</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, backgroundColor: '#006400', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backButton: { marginBottom: 15 },
  backText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  courseCode: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  courseTitle: { fontSize: 16, color: '#E0E0E0', marginTop: 5 },
  content: { padding: 20 },
  promptText: { fontSize: 18, color: '#333', fontWeight: 'bold', marginBottom: 20 },
  actionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  actionIcon: { fontSize: 30, marginRight: 15 },
  actionText: { fontSize: 18, fontWeight: 'bold', color: '#006400' }
});