import Markdown from 'react-native-markdown-display';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { cacheSummary, getCachedSummary } from '../../utils/offlineStorage';

export default function SummaryPage() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    loadSummary();
  }, [id]);

  const loadSummary = async () => {
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const res = await fetch(`https://noun-study-buddy.onrender.com/api/summaries/course/${id}/`, { signal: controller.signal as any });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      
      setCourseData(data);
      setLoading(false);
    } catch (err) {
      console.log('Summary API fetch failed.');
      setLoading(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></SafeAreaView>;
  }

  const hasError = courseData?.detail || !courseData?.title;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{courseData?.title || 'Course Summary'}</Text>
      </View>

      <ScrollView style={styles.contentContainer}>
        {hasError ? (
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 30 }}>
            {courseData?.detail || "No summary available for this course yet."}
          </Text>
        ) : (
          <Markdown style={{ body: [styles.summaryText, { color: colors.text }] }}>
            {courseData?.content || "No summary content available yet."}
          </Markdown>
        )}
      </ScrollView>

      {/* Download Button */}
      {courseData?.file && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.accent }]} 
            onPress={() => Linking.openURL(courseData.file)}
          >
            <Text style={styles.actionBtnText}>📥 Download PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 20 },
  summaryText: { fontSize: 16, lineHeight: 26 },
  actionRow: { flexDirection: 'row', padding: 14, gap: 10 },
  actionBtn: { 
    flex: 1,
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center',
    elevation: 3,
  },
  actionBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});