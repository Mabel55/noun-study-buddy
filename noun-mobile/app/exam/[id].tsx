import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, 
  Alert, SafeAreaView, TextInput, ScrollView, Platform 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function TimedExamPage() {
  const { id } = useLocalSearchParams();
  const cleanId = String(id).split('?')[0];

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Exam State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Timer State (45 minutes)
  const [timeLeft, setTimeLeft] = useState(2700);

  useEffect(() => {
    if (!cleanId) return;

    fetch(`https://noun-study-buddy.onrender.com/api/courses/${cleanId}/`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        // Combine CBT and FILL questions into one list
        const cbt = (data.cbt_questions || []).map((q: any) => ({ ...q, qType: 'CBT' }));
        const fill = (data.fill_questions || []).map((q: any) => ({ ...q, qType: 'FILL' }));
        setQuestions([...cbt, ...fill]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [cleanId]);

  useEffect(() => {
    if (loading || isSubmitted || questions.length === 0) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, isSubmitted, questions.length]);

  const handleAnswer = (questionId: number, answerText: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerText
    }));
  };

  const calculateScore = () => {
    let finalScore = 0;
    questions.forEach(q => {
      const userAnswer = selectedAnswers[q.id] || "";
      if (q.qType === 'CBT') {
        if (userAnswer === q.correct_answer) finalScore += 1;
      } else if (q.qType === 'FILL') {
        if (userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
          finalScore += 1;
        }
      }
    });
    setScore(finalScore);
    setIsSubmitted(true);
  };

  const handleManualSubmit = () => {
    const msg = "Are you sure you want to submit? You cannot change your answers after this.";
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) calculateScore();
    } else {
      Alert.alert("Submit Exam", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: calculateScore }
      ]);
    }
  };

  const handleAutoSubmit = () => {
    const msg = "Time's Up! Your exam has been automatically submitted.";
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert("Time's Up!", msg);
    }
    calculateScore();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />;
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.examHeader}>
          <Text style={styles.headerTitle}>Exam Unavailable</Text>
        </View>
        <Text style={styles.errorText}>No questions generated for this course yet.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isSubmitted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.examHeader}>
          <Text style={styles.headerTitle}>Exam Results</Text>
        </View>
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>You Scored:</Text>
          <Text style={styles.scoreText}>{score} / {questions.length}</Text>
          <Text style={styles.percentageText}>{percentage}%</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>Return to Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* TIMER HEADER */}
      <View style={styles.examHeader}>
        <Text style={styles.courseCode}>{courseData?.code} Mock Exam</Text>
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
      </View>

      {/* SCROLLABLE QUESTION AREA */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQ.text}</Text>

          {currentQ.qType === 'CBT' && ['A', 'B', 'C', 'D'].map((letter) => {
            const optionKey = `option_${letter.toLowerCase()}`;
            const isSelected = selectedAnswers[currentQ.id] === letter;
            return (
              <TouchableOpacity
                key={letter}
                style={[styles.optionRow, isSelected && styles.optionSelected]}
                onPress={() => handleAnswer(currentQ.id, letter)}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {letter}. {currentQ[optionKey]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {currentQ.qType === 'FILL' && (
            <TextInput
              style={styles.textInput}
              placeholder="Type your answer here..."
              value={selectedAnswers[currentQ.id] || ''}
              onChangeText={(text) => handleAnswer(currentQ.id, text)}
            />
          )}
        </View>
      </ScrollView>

      {/* FIXED FOOTER NAVIGATION */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navDisabled]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex(prev => prev - 1)}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit}>
            <Text style={styles.submitButtonText}>Submit Exam</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={() => setCurrentIndex(prev => prev + 1)}>
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  examHeader: { 
    backgroundColor: '#006400', 
    padding: 20, 
    paddingTop: 40, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  courseCode: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  timerBox: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  progressContainer: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  progressText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 2 },
  questionText: { fontSize: 18, color: '#333', lineHeight: 28, marginBottom: 25, fontWeight: '500' },
  optionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 8, 
    marginBottom: 12 
  },
  optionSelected: { borderColor: '#006400', backgroundColor: '#F0FDF4' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#006400' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#006400' },
  optionText: { fontSize: 16, color: '#444', flex: 1 },
  optionTextSelected: { color: '#006400', fontWeight: 'bold' },
  textInput: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 15, fontSize: 18, marginTop: 10 },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20
  },
  navButton: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, backgroundColor: '#E0E0E0' },
  navButtonText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  navDisabled: { opacity: 0.5 },
  submitButton: { backgroundColor: '#006400', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultCard: { margin: 20, padding: 30, backgroundColor: 'white', borderRadius: 12, alignItems: 'center' },
  resultText: { fontSize: 18, color: '#666', marginBottom: 10 },
  scoreText: { fontSize: 30, fontWeight: 'bold', color: '#333' },
  percentageText: { fontSize: 48, fontWeight: 'bold', color: '#006400', marginBottom: 20 },
  backButton: { backgroundColor: '#006400', padding: 15, borderRadius: 8, marginTop: 20 },
  backButtonText: { color: 'white', fontWeight: 'bold' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'red' }
});