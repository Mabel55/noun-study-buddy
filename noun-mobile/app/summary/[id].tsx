import Markdown from 'react-native-markdown-display';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import * as Speech from 'expo-speech';

export default function SummaryPage() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    fetch(`https://noun-study-buddy.onrender.com/api/summaries/course/${id}/`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => console.error(err));

    // Cleanup: stop speech when leaving page
    return () => {
      Speech.stop();
    };
  }, [id]);

  const toggleSpeech = () => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
    } else {
      const text = courseData?.content || '';
      if (!text) return;

      const cleanText = text
        .replace(/[#*`_~>[\]()=\-|]/g, ' ') // Strip out ALL markdown and separator characters like ===
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      setIsPlaying(true);
      
      // Splitting text into safe sentence-sized chunks to prevent memory crashes
      const chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

      let chunkIndex = 0;

      const speakNext = () => {
        if (chunkIndex >= chunks.length || !isPlaying) {
          setIsPlaying(false);
          return;
        }
        
        Speech.speak(chunks[chunkIndex].trim(), {
          language: 'en-US',
          rate: 0.9,
          pitch: 1.0,
          onDone: () => {
            chunkIndex++;
            // A tiny delay to allow the hardware audio buffer to flush
            if (Platform.OS === 'ios') {
               setTimeout(speakNext, 50);
            } else {
               speakNext();
            }
          },
          onError: () => {
            setIsPlaying(false);
            Speech.stop();
          }
        });
      };

      speakNext();
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

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {/* Audio Button */}
        {!hasError && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: isPlaying ? colors.error : colors.accent }]} 
            onPress={toggleSpeech}
          >
            <Text style={styles.actionBtnText}>{isPlaying ? '⏹️ Stop Audio' : '🔊 Listen'}</Text>
          </TouchableOpacity>
        )}

        {/* Download Button */}
        {courseData?.file && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.accent }]} 
            onPress={() => Linking.openURL(courseData.file)}
          >
            <Text style={styles.actionBtnText}>📥 Download PDF</Text>
          </TouchableOpacity>
        )}
      </View>
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