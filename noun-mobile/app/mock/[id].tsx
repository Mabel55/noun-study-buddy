import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MockExamEngine() {
  const { id, format } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<any>({});
  const [revealed, setRevealed] = useState<{[key: string]: boolean}>({});
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(45 * 60); 
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const cleanId = String(id).split('?')[0];
    const isPOP = format === 'POP' || String(id).includes('format=POP');

    fetch(`https://noun-study-buddy.onrender.com/api/courses/${cleanId}/`)
      .then(res => res.json())
      .then(data => {
        let list = isPOP 
          ? [...(data.pop_questions || []), ...(data.fill_questions || [])]
          : (data.cbt_questions || []);
        setQuestions(list);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, format]);

  useEffect(() => {
    if (!loading && questions.length > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (Platform.OS === 'web') {
               window.alert("Time's Up! Submitting exam now.");
            } else {
               Alert.alert("Time's Up!", "Your 45 minutes are over. Submitting exam now.");
            }
            handleAutoSubmit(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, submitted, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleAutoSubmit = () => {
    setScore(() => {
       let currentScore = 0;
       questions.forEach(q => {
         const userAns = (selectedAnswers[q.id] || "").trim().toLowerCase();
         // Check multiple possible field names for the correct answer
         const correctAns = (q.correct_answer || q.answer || "").trim().toLowerCase();
         if (userAns === correctAns && correctAns !== "") currentScore++;
       });
       return currentScore;
    });
    setSubmitted(true);
  };

  // 👉 THE FIX FOR THE SUBMIT BUTTON ON WEB BROWSERS
  const handleManualSubmit = () => {
    if (Platform.OS === 'web') {
      const confirmSubmit = window.confirm("Are you sure you want to submit your answers?");
      if (confirmSubmit) handleAutoSubmit();
    } else {
      Alert.alert("Submit Exam", "Are you sure you want to submit your answers?", [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Submit", onPress: () => handleAutoSubmit() }
      ]);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a4d3a" /></View>;
  
  if (questions.length === 0) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Exam Unavailable: No questions found.</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={{color:'#fff'}}>Go Back</Text></TouchableOpacity>
    </View>
  );

  if (submitted) return (
    <View style={styles.center}>
      <Text style={styles.title}>Final Score: {score} / {questions.length}</Text>
      <Text style={{ fontSize: 18, marginTop: 10, marginBottom: 30 }}>{Math.round((score / questions.length) * 100)}%</Text>
      <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}><Text style={{color:'#fff', fontWeight: 'bold'}}>Return to Home</Text></TouchableOpacity>
    </View>
  );

  const currentQ = questions[currentIndex];
  const isCBT = !!currentQ?.option_a;
  const isRevealed = revealed[currentQ.id];
  const correctAnsLetter = (currentQ.correct_answer || "").toLowerCase();

  // 👉 THE FIX FOR TYPESCRIPT RED LINES (Cleaner style application)
  const getOptionStyle = (letter: string, isSelected: boolean) => {
    if (isRevealed) {
      if (letter === correctAnsLetter) return [styles.option, styles.correctOption];
      if (isSelected) return [styles.option, styles.wrongOption];
      return styles.option;
    }
    if (isSelected) return [styles.option, styles.selectedOption];
    return styles.option;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={{color:'#fff', fontSize: 16, fontWeight: 'bold'}}>Q {currentIndex + 1} / {questions.length}</Text>
        <View style={styles.timerBox}><Text style={styles.timerText}>⏱️ {formatTime(timeLeft)}</Text></View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQ?.text || currentQ?.question_text}</Text>

          {isCBT ? (
            ['a', 'b', 'c', 'd'].map((letter) => {
              const optionText = currentQ[`option_${letter}`];
              if (!optionText) return null;
              const isSelected = selectedAnswers[currentQ.id] === letter;

              return (
                <TouchableOpacity
                  key={letter}
                  style={getOptionStyle(letter, isSelected)}
                  disabled={isRevealed} 
                  onPress={() => setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: letter })}
                >
                  <Text style={{ fontSize: 16, fontWeight: isSelected || (isRevealed && letter === correctAnsLetter) ? 'bold' : 'normal', color: (isRevealed && letter === correctAnsLetter) ? '#1b5e20' : '#333' }}>
                    {letter.toUpperCase()}. {optionText}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <TextInput
              style={styles.textInput}
              placeholder="Type your answer here..."
              multiline
              editable={!isRevealed} 
              value={selectedAnswers[currentQ.id] || ''}
              onChangeText={(text) => setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: text })}
            />
          )}

          {!isRevealed ? (
            <TouchableOpacity style={styles.revealButton} onPress={() => setRevealed({...revealed, [currentQ.id]: true})}>
              <Text style={styles.revealText}>💡 Reveal Answer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Correct Answer:</Text>
              {/* 👉 THE FIX FOR EMPTY POP ANSWERS: Checks multiple Django column names */}
              <Text style={styles.answerCorrectText}>
                {isCBT 
                  ? `${correctAnsLetter.toUpperCase()}. ${currentQ[`option_${correctAnsLetter}`]}` 
                  : (currentQ.correct_answer || currentQ.answer || "Answer not provided in database.")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.navButton, currentIndex === 0 && { opacity: 0.4 }]} disabled={currentIndex === 0} onPress={() => setCurrentIndex(c => c - 1)}>
          <Text style={styles.navText}>Previous</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Submit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={() => setCurrentIndex(c => c + 1)}>
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// UI STYLES - Harmonized with NOUN Green Theme (#1a4d3a)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: '#1a4d3a', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerBox: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  questionText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333', lineHeight: 26 },
  
  option: { padding: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, borderRadius: 8, backgroundColor: '#fafafa' },
  selectedOption: { borderColor: '#1a4d3a', backgroundColor: '#e8f5e9' },
  correctOption: { borderColor: '#4caf50', backgroundColor: '#e8f5e9', borderWidth: 2 },
  wrongOption: { borderColor: '#f44336', backgroundColor: '#ffebee', borderWidth: 2 },
  
  revealButton: { marginTop: 15, padding: 15, borderRadius: 8, backgroundColor: '#e0f2f1', alignItems: 'center', borderWidth: 1, borderColor: '#009688' },
  revealText: { color: '#00695c', fontWeight: 'bold', fontSize: 16 },
  answerBox: { marginTop: 20, padding: 15, backgroundColor: '#e8f5e9', borderRadius: 8, borderWidth: 1, borderColor: '#4caf50' },
  answerLabel: { fontSize: 14, color: '#2e7d32', fontWeight: 'bold', marginBottom: 5 },
  answerCorrectText: { fontSize: 16, color: '#1b5e20', fontWeight: '500' },
  
  textInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top', backgroundColor: '#fafafa' },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  navButton: { padding: 15, backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 25, minWidth: 100, alignItems: 'center' },
  navText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  submitButton: { padding: 15, backgroundColor: '#1a4d3a', borderRadius: 8, paddingHorizontal: 30, minWidth: 100, alignItems: 'center' },
  backButton: { backgroundColor: '#1a4d3a', padding: 15, borderRadius: 8, paddingHorizontal: 30, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a4d3a' }
});