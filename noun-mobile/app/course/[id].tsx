import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
      .catch(err => console.error(err));
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />;
  }

  // 🚀 THE SMART NOUN FILTER: Automatically checks the course level!
  const courseCode = courseData?.code || '';
  const firstDigitMatch = courseCode.match(/\d/); 
  // If the first number in the course code is 3 or higher, it's a POP course!
  const isPOP = firstDigitMatch && parseInt(firstDigitMatch[0], 10) >= 3;

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

        {/* 2. Dynamic Exam Button (Changes based on 100L-200L vs 300L+) */}
        {isPOP ? (
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/mock/${id}?format=POP` as any)}>
            <Text style={styles.actionIcon}>📝</Text>
            <View>
              <Text style={styles.actionText}>Take POP Exam</Text>
              <Text style={styles.subText}>(Theory & Fill-in-gap)</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push(`/mock/${id}` as any)}>
            <Text style={styles.actionIcon}>💻</Text>
            <View>
               <Text style={styles.actionText}>Take CBT Exam</Text>
               <Text style={styles.subText}>(Multiple Choice & Fill-in-gap)</Text>
            </View>
          </TouchableOpacity>
        )}

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
  actionText: { fontSize: 18, fontWeight: 'bold', color: '#006400' },
  subText: { fontSize: 13, color: '#666', marginTop: 2 }
});