import Markdown from 'react-native-markdown-display';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function SummaryPage() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the course data from Django
    fetch(`https://noun-study-buddy.onrender.com/api/summaries/course/${id}/`)
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

  // Django might call the list "summaries", "course_summaries", or something else depending on your models
  const summaries = courseData?.summaries || courseData?.course_summaries || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{courseData.title}</Text>
      </View>

      <ScrollView style={styles.contentContainer}>
  {/* We tell Markdown to apply your summaryText style to its 'body' text */}
  <Markdown style={{ body: styles.summaryText }}>
    {courseData?.content || "No summary available for this course yet."}
  </Markdown>
</ScrollView>
      <TouchableOpacity 
        style={styles.downloadButton} 
        onPress={() => Linking.openURL(courseData.file)}
      >
        <Text style={styles.downloadText}>📥 Download Full PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#006400', padding: 20, paddingTop: 40, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 20, marginTop: 20 },
  summaryText: { fontSize: 18, lineHeight: 28, color: '#333', textAlign: 'center' },
  downloadButton: { 
    backgroundColor: '#006400', 
    margin: 20, 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  downloadText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});