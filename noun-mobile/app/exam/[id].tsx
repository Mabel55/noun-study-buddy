import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function TimedExamPage() {
  const { id } = useLocalSearchParams();
  const cleanId = String(id).split('?')[0];

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Exam State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  // Timer State: Hardcoded to 45 minutes (2700 seconds)
  const [timeLeft, setTimeLeft] = useState(2700); 

  useEffect(() => {
    if (!cleanId) return;

    fetch(`http://localhost:8000/api/courses/${cleanId}/`)
      .then(res => res.json())
      .then(data => {
        setCourseData(data);
        
        // Combine CBT and Fill-in-the-Gap into one single exam list!
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

  // The Countdown Timer Logic
  useEffect(() => {
    if (loading || isSubmitted || questions.length === 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
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

  // Handles both clicking A/B/C/D and typing text!
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
        // Compare Fill-in-the-gap text (ignoring uppercase/lowercase and extra spaces)
        if (userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
            finalScore += 1;
        }
      }
    });
    setScore(finalScore);
    setIsSubmitted(true);
  };

  const handleManualSubmit = () => {
    // The Web-Safe popup fix!
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to submit? You cannot change your answers after this.")) {
        calculateScore();
      }
    } else {
      Alert.alert(
        "Submit Exam",
        "Are you sure you want to submit? You cannot change your answers after this.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: calculateScore }
        ]
      );
    }
  };

  const handleAutoSubmit = () => {
    if (Platform.OS === 'web') {
        window.alert("Time's Up! Your exam has been automatically submitted.");
    } else {
        Alert.alert("Time's Up!", "Your exam has been automatically submitted.");
    }
    calculateScore();
  };

  // Format time (e.g., 2700 -> 45:00)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <ActivityIndicator size="large" color="#006400" style={{ marginTop: 50 }} />;

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Exam Unavailable</Text></View>
        <Text style={styles.errorText}>No questions available for this course.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- SUBMITTED / RESULTS SCREEN ---
  if (isSubmitted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Exam Results</Text>
        </View>
        <View style={styles.resultCard}>
            <Text style={styles.resultText}>You Scored:</Text>
            <Text style={styles.scoreText}>{score} / {questions.length}</Text>
            <Text style={styles.percentageText}>{percentage}%</Text>
            
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Return to Menu</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- ACTIVE EXAM SCREEN ---
  const currentQ = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* EXAM HEADER WITH TIMER */}
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

      {/* QUESTION CARD */}
      <View style={styles.content}>
        <View style={styles.card}>
          {/* Use 'text' for CBT and 'question_text' for Fill-in-Gap */}
          <Text style={styles.questionText}>
             {currentQ.qType === 'CBT' ? currentQ.text : currentQ.question_text}
          </Text>

          {/* Render 4 Options if it is a CBT question */}
          {currentQ.qType === 'CBT' && ['A', 'B', 'C', 'D'].map((letter) => {
            const optionKey = `option_${letter.toLowerCase()}`;
            const optionText = currentQ[optionKey];
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
                    {letter}. {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Render Text Box if it is a Fill-in-the-gap question */}
          {currentQ.qType === 'FILL' && (
             <TextInput
                style={styles.textInput}
                placeholder="Type your answer here..."
                value={selectedAnswers[currentQ.id] || ''}
                onChangeText={(text) => handleAnswer(currentQ.id, text)}
             />
          )}

        </View>
      </View>

      {/* FOOTER NAVIGATION */}
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
  examHeader: { backgroundColor: '#006400', padding: 20, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseCode: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  timerBox: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  progressContainer: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#E0E0E0' },
  progressText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 2 },
  questionText: { fontSize: 18, color: '#333', lineHeight: 28, marginBottom: 25, fontWeight: '500' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginBottom: 12, backgroundColor: '#FAFAFA' },
  optionSelected: { borderColor: '#006400', backgroundColor: '#F0FDF4' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC', marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#006400' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#006400' },
  optionText: { fontSize: 16, color: '#444', flex: 1 },
  optionTextSelected: { color: '#006400', fontWeight: 'bold' },
  textInput: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 15, fontSize: 18, backgroundColor: '#FAFAFA', color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#E0E0E0' },
  navButton: { backgroundColor: '#E0E0E0', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  navDisabled: { opacity: 0.5 },
  navButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  submitButton: { backgroundColor: '#006400', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  header: { backgroundColor: '#006400', padding: 20, paddingTop: 40, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  errorText: { fontSize: 18, textAlign: 'center', marginTop: 50, color: '#333' },
  resultCard: { margin: 20, padding: 30, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', elevation: 3 },
  resultText: { fontSize: 20, color: '#666', marginBottom: 10 },
  scoreText: { fontSize: 48, fontWeight: 'bold', color: '#006400', marginBottom: 5 },
  percentageText: { fontSize: 24, color: '#333', marginBottom: 30 },
  backButton: { backgroundColor: '#006400', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  backButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});