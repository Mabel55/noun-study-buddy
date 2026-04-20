import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';

// UPDATE THIS URL based on your testing environment (Emulator vs Physical Phone)
const API_URL = 'http://localhost:8000/api/courses/'; 

export default function CourseDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the courses from your Django Backend
  useEffect(() => {
    fetch(API_URL)
      .then((response) => response.json())
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching courses:", error);
        setLoading(false);
      });
  }, []);

  // The design for a single course card
  const renderCourseCard = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/course/${item.id}`)}>
      <Text style={styles.courseCode}>{item.code}</Text>
      <Text style={styles.courseTitle}>{item.title}</Text>
      <View style={styles.actionRow}>
        <Text style={styles.actionText}>Tap to start studying →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 NOUN Study Buddy</Text>
        <Text style={styles.headerSubtitle}>Select a course to begin your mock exam</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCourseCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// Clean, native styling with a university-green vibe
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    backgroundColor: '#006400',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#006400',
  },
});
