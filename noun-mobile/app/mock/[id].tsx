import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function MockExamPage() {
  // Grab the ID and the format from the URL
  const params = useLocalSearchParams();
  const rawId = params.id as string;
  const format = params.format as string;
  
  // Clean the ID just in case the browser passes '?format=...' as part of it
  const cleanId = rawId ? rawId.split('?')[0] : '';

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to whatever was clicked on the previous screen (or CBT)
  const [activeTab, setActiveTab] = useState(format || 'CBT'); 

  // Track which answers are revealed
  const [revealedAnswers, setRevealedAnswers] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (!cleanId) return;
    
    // IMPORTANT: Using localhost so the browser doesn't block it!
    fetch(`http://localhost:8000/api/courses/${cleanId}/`)
      .then(res => {
          if (!res.ok) console.warn("Django Error: " + res.status);
          return res.json();
      })
      .then(data => {
        setCourseData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [cleanId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />;
  }

  // Check if any questions exist across all 3 formats
  const hasCBT = courseData?.cbt_questions?.length > 0;
  const hasPOP = courseData?.pop_questions?.length > 0;
  const hasFill = courseData?.fill_questions?.length > 0;
  const hasAnyQuestions = hasCBT || hasPOP || hasFill;

  if (!hasAnyQuestions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Exam Unavailable</Text>
        </View>
        <Text style={styles.errorText}>No questions have been generated for this course yet.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleAnswer = (questionId: number) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  return (
    <View style={styles.container}>
      {/* EXAM HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{courseData?.code} Practice Center</Text>
        <Text style={styles.subText}>Select your exam format below</Text>
      </View>

      {/* THE 3 TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'CBT' && styles.activeTab]} 
            onPress={() => setActiveTab('CBT')}
        >
            <Text style={[styles.tabText, activeTab === 'CBT' && styles.activeTabText]}>
              CBT ({courseData?.cbt_questions?.length || 0})
            </Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.tab, activeTab === 'POP' && styles.activeTab]} 
            onPress={() => setActiveTab('POP')}
        >
            <Text style={[styles.tabText, activeTab === 'POP' && styles.activeTabText]}>
              POP ({courseData?.pop_questions?.length || 0})
            </Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.tab, activeTab === 'FILL' && styles.activeTab]} 
            onPress={() => setActiveTab('FILL')}
        >
            <Text style={[styles.tabText, activeTab === 'FILL' && styles.activeTabText]}>
              Fill-in-Gap ({courseData?.fill_questions?.length || 0})
            </Text>
        </TouchableOpacity>
      </View>

      {/* QUESTIONS AREA */}
      <ScrollView style={styles.contentContainer}>
        
        {/* Render CBT Questions (Multiple Choice) */}
        {activeTab === 'CBT' && hasCBT ? (
          courseData.cbt_questions.map((q: any, index: number) => (
            <View key={`cbt-${q.id}`} style={styles.card}>
              <Text style={styles.questionNumber}>Question {index + 1}</Text>
              <Text style={styles.questionText}>{q.text}</Text>
              
              {/* The 4 Options */}
              <View style={styles.optionsContainer}>
                <Text style={styles.optionText}>A. {q.option_a}</Text>
                <Text style={styles.optionText}>B. {q.option_b}</Text>
                <Text style={styles.optionText}>C. {q.option_c}</Text>
                <Text style={styles.optionText}>D. {q.option_d}</Text>
              </View>

              {revealedAnswers[q.id] && (
                <View style={styles.answerBox}>
                  <Text style={styles.answerHeader}>Correct Answer:</Text>
                  <Text style={styles.answerText}>Option {q.correct_answer}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.revealButton} 
                onPress={() => toggleAnswer(q.id)}
              >
                <Text style={styles.revealButtonText}>
                  {revealedAnswers[q.id] ? "Hide Answer" : "Show Correct Answer"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : activeTab === 'CBT' && (
           <View style={styles.emptyCard}>
             <Text style={styles.placeholderText}>No CBT questions generated yet.</Text>
           </View>
        )}

        {/* Render POP Questions (Essays) */}
        {activeTab === 'POP' && hasPOP ? (
          courseData.pop_questions.map((q: any, index: number) => (
            <View key={`pop-${q.id}`} style={styles.card}>
              <Text style={styles.questionNumber}>Question {index + 1}</Text>
              <Text style={styles.questionText}>{q.question_text}</Text>
              
              {revealedAnswers[q.id] && (
                <View style={styles.answerBox}>
                  <Text style={styles.answerHeader}>Model Answer:</Text>
                  <Text style={styles.answerText}>{q.answer_text}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.revealButton} 
                onPress={() => toggleAnswer(q.id)}
              >
                <Text style={styles.revealButtonText}>
                  {revealedAnswers[q.id] ? "Hide Answer" : "Reveal Answer"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : activeTab === 'POP' && (
           <View style={styles.emptyCard}>
             <Text style={styles.placeholderText}>No POP essays generated yet.</Text>
           </View>
        )}

        {/* Render Fill-in-the-Gap Questions */}
        {activeTab === 'FILL' && hasFill ? (
          courseData.fill_questions.map((q: any, index: number) => (
            <View key={`fill-${q.id}`} style={styles.card}>
              <Text style={styles.questionNumber}>Question {index + 1}</Text>
              <Text style={styles.questionText}>{q.question_text}</Text>
              
              {revealedAnswers[q.id] && (
                <View style={styles.answerBox}>
                  <Text style={styles.answerHeader}>Correct Answer:</Text>
                  <Text style={styles.answerText}>{q.correct_answer}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.revealButton} 
                onPress={() => toggleAnswer(q.id)}
              >
                <Text style={styles.revealButtonText}>
                  {revealedAnswers[q.id] ? "Hide Answer" : "Reveal Answer"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : activeTab === 'FILL' && (
           <View style={styles.emptyCard}>
             <Text style={styles.placeholderText}>No Fill-in-the-gap questions generated yet.</Text>
           </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#006400', padding: 20, paddingTop: 40, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  subText: { color: '#E0E0E0', fontSize: 16, marginTop: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#006400' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#006400', fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 20 },
  emptyCard: { backgroundColor: 'white', padding: 30, borderRadius: 12, elevation: 3, marginTop: 20 },
  questionNumber: { fontSize: 14, fontWeight: 'bold', color: '#006400', marginBottom: 10 },
  questionText: { fontSize: 18, color: '#333', lineHeight: 26, marginBottom: 20 },
  optionsContainer: { marginTop: 5, marginBottom: 20 },
  optionText: { fontSize: 16, color: '#444', marginBottom: 8, paddingLeft: 10 },
  answerBox: { backgroundColor: '#F0FDF4', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0' },
  answerHeader: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 5 },
  answerText: { fontSize: 16, color: '#14532D', lineHeight: 24 },
  revealButton: { backgroundColor: '#006400', padding: 12, borderRadius: 8, alignItems: 'center' },
  revealButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  placeholderText: { fontSize: 18, color: '#666', textAlign: 'center' },
  errorText: { fontSize: 18, textAlign: 'center', marginTop: 50, color: '#333' },
  backButton: { backgroundColor: '#006400', padding: 15, borderRadius: 8, margin: 30, alignItems: 'center' },
  backButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});