import Markdown from 'react-native-markdown-display';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Linking } from 'react-native';
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

  const toggleSpeech = async () => {
    const isSpeaking = await Speech.isSpeakingAsync();
    
    if (isPlaying || isSpeaking) {
      Speech.stop();
      setIsPlaying(false);
    } else {
      const text = courseData?.content || '';
      if (!text) return;

      // 1. Strip Markdown characters so it sounds natural
      const cleanText = text
        .replace(/[#*`_~>[\]()-]/g, ' ') // Remove markdown symbols
        .replace(/https?:\/\/\S+/g, '') // Remove links
        .replace(/\s+/g, ' ')           // Normalize spaces
        .trim();

      setIsPlaying(true);
      
      // Android TTS has a hard 4000 character limit per utterance.
      // We chunk by sentences and queue them up to bypass this limit.
      const chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
      chunks.forEach((chunk, index) => {
        if (!chunk.trim()) return;
        
        Speech.speak(chunk.trim(), {
          rate: 0.9,
          pitch: 1.0,
          onDone: () => {
            // When the last chunk finishes, turn off the playing state
            if (index === chunks.length - 1) {
              setIsPlaying(false);
            }
          },
          onError: () => {
            setIsPlaying(false);
            Speech.stop();
          }
        });
      });
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