import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  text?: string;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  qType: 'CBT' | 'FILL';
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL = 'https://noun-study-buddy-1.onrender.com';
const EXAM_DURATION_MINUTES = 45;

export default function ExamScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  // FIX 1: <any> tells TypeScript to accept any key-value pair, removing the red lines
  const [selectedAnswers, setSelectedAnswers] = useState<any>({}); 
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_MINUTES * 60);
  const [examStarted, setExamStarted] = useState(false);

  // FIX 2: <any> stops the "Node.js Timeout" vs "React.js Timeout" red line error
  const timerRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Fetch Questions (Using YOUR working URL!) ───────────────────────────
  useEffect(() => {
    if (id) fetchQuestions();
  }, [id]);

  const fetchQuestions = async () => {
    try {
      const cleanId = String(id).split('?')[0]; 
      
      const response = await fetch(`${BASE_URL}/api/questions/?course=${cleanId}`);

      const data = await response.json();
      
      const questionArray = Array.isArray(data) ? data : (data.results || []);

      const formattedData = questionArray.map((q: any) => ({
        ...q,
        qType: q.option_a ? 'CBT' : 'FILL'
      }));
      
      setQuestions(formattedData);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
    }
  };

  // ─── Timer Logic ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (examStarted && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(true); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ─── Submission Logic ───────────────────────────────────────────────────
  const handleSubmit = (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(selectedAnswers).length;
      if (unanswered > 0) {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
           if (window.confirm(`You have ${unanswered} unanswered question(s). Submit now?`)) {
             calculateScore();
           }
        } else {
          Alert.alert(
            'Incomplete Exam',
            `You have ${unanswered} unanswered question(s). Submit now?`,
            [
              { text: 'Continue', style: 'cancel' },
              { text: 'Submit', style: 'destructive', onPress: () => calculateScore() },
            ]
          );
        }
        return;
      }
    }
    calculateScore();
  };

  const calculateScore = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let correctCount = 0;
    questions.forEach((q) => {
      const userAnswer = (selectedAnswers[q.id] || "").trim().toLowerCase();
      const correctAnswer = (q.correct_answer || "").trim().toLowerCase();
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  // ─── Render 1: Loading ───────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#1a4d3a" />
      <Text style={{marginTop: 10}}>Loading Exam...</Text>
    </SafeAreaView>
  );

  // ─── Render 2: Empty State ───────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={{ fontSize: 50, marginBottom: 15 }}>📭</Text>
        <Text style={{ fontSize: 18, color: '#1a4d3a', fontWeight: 'bold' }}>No questions available.</Text>
        <Text style={{ color: '#666', marginTop: 5, marginBottom: 20 }}>This course has no mock questions yet.</Text>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.back()}>
          <Text style={styles.homeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Render 3: Start Screen ──────────────────────────────────────────────
  if (!examStarted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.startTitle}>Ready to begin?</Text>
        <Text style={{fontSize: 16, marginBottom: 30}}>You have {questions.length} questions to answer in {EXAM_DURATION_MINUTES} minutes.</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => setExamStarted(true)}>
          <Text style={styles.startButtonText}>Begin Exam 🚀</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Render 4: Results ───────────────────────────────────────────────────
  if (submitted) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.resultsContainer}>
          <Text style={styles.gradeText}>{percent}%</Text>
          <Text style={styles.scoreText}>You scored {score} out of {questions.length}</Text>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.back()}>
            <Text style={styles.homeButtonText}>Return to Course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render 5: The Exam ──────────────────────────────────────────────────
  const currentQ = questions[currentIndex];

  if (!currentQ) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a4d3a" />

      <View style={styles.examHeader}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>⏱️ {formatTime(timeLeft)}</Text>
        </View>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
          <Text style={styles.questionText}>{currentQ.question_text || currentQ.text}</Text>

          {currentQ.qType === 'CBT' && ['A', 'B', 'C', 'D'].map((letter) => {
            const optionKey = `option_${letter.toLowerCase()}` as keyof Question;
            const isSelected = selectedAnswers[currentQ.id] === letter;
            return (
              <TouchableOpacity
                key={letter}
                style={[styles.optionButton, isSelected && styles.optionSelected]}
                onPress={() => setSelectedAnswers((prev: any) => ({ ...prev, [currentQ.id]: letter }))}
              >
                <View style={[styles.radio, isSelected && styles.radioActive]} />
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                  {letter}. {currentQ[optionKey] as string}
                </Text>
              </TouchableOpacity>
            );
          })}

          {currentQ.qType === 'FILL' && (
            <TextInput
              style={styles.textInput}
              placeholder="Type your answer here..."
              value={selectedAnswers[currentQ.id] || ''}
              onChangeText={(text) => setSelectedAnswers((prev: any) => ({ ...prev, [currentQ.id]: text }))}
              autoCapitalize="none"
            />
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.navButton, currentIndex === 0 && styles.navDisabled]} 
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex(prev => prev - 1)}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmit()}>
            <Text style={styles.submitButtonText}>Submit ✅</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => setCurrentIndex(prev => prev + 1)}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f5', padding: 20 },
  examHeader: { 
    backgroundColor: '#1a4d3a', 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  // FIX 3: timerContainer added to the styles so the red line on line 228 goes away
  timerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  timerText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  progressText: { color: '#a8d5b5', fontSize: 14, fontWeight: 'bold' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 }, 
  questionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  questionText: { fontSize: 18, color: '#333', lineHeight: 26, marginBottom: 20, fontWeight: '600' },
  optionsContainer: { gap: 12 },
  optionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee', 
    backgroundColor: '#fff' 
  },
  optionSelected: { borderColor: '#1a4d3a', backgroundColor: '#e8f5e9' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ccc', marginRight: 12 },
  radioActive: { borderColor: '#1a4d3a', backgroundColor: '#1a4d3a' },
  optionText: { fontSize: 15, color: '#444', flex: 1 },
  optionTextActive: { color: '#1a4d3a', fontWeight: 'bold' },
  textInput: { 
    borderWidth: 1, 
    borderColor: '#eee', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    backgroundColor: '#fafafa' 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#eee' 
  },
  navButton: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  navButtonText: { fontWeight: 'bold', color: '#555' },
  navDisabled: { opacity: 0.3 },
  submitButton: { backgroundColor: '#1a4d3a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  resultsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  gradeText: { fontSize: 80, fontWeight: '900', color: '#1a4d3a' },
  scoreText: { fontSize: 18, color: '#666', marginVertical: 20 },
  homeButton: { backgroundColor: '#1a4d3a', padding: 16, borderRadius: 8, marginTop: 10 },
  homeButtonText: { color: '#fff', fontWeight: 'bold' },
  startTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a4d3a', marginBottom: 8 },
  startButton: { backgroundColor: '#1a4d3a', width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});