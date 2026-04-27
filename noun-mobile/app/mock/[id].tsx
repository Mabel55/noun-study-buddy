import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// ─── CONFIG ──────────────────────────────────────────────────────────────
const BASE_URL = 'https://noun-study-buddy.onrender.com';
const EXAM_MINUTES = 45;
const NOUN_GREEN = '#006600';
const NOUN_LIGHT_GREEN = '#e8f5e9';
const NOUN_MID_GREEN = '#2e7d32';

export default function MockExamEngine() {
  const { id, format, mode } = useLocalSearchParams(); 
  const router = useRouter();

  // 🛡️ THE SAFETY SWITCH
  const isStudyMode = mode === 'study';

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60);
  
  // Study mode skips the "Begin" screen
  const [examStarted, setExamStarted] = useState(isStudyMode);
  
  const timerRef = useRef<any>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (id && !hasFetched.current) {
      hasFetched.current = true;
      fetchQuestions();
    }
  }, [id, format]);

  const fetchQuestions = async () => {
    try {
      const cleanId = String(id).split('?')[0];

      const fetchSafe = async (url: string, type: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return []; 
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.results || []);
          return list.filter((q: any) => {
            const cVal = String(q.course?.id || q.course || q.course_id || '');
            return cVal === String(cleanId) || cVal.includes(`/courses/${cleanId}/`);
          }).map((q: any) => ({ ...q, qType: type }));
        } catch (e) { return []; }
      };

      // Fetch all three types to prevent "missing" questions
      const fillQ = await fetchSafe(`${BASE_URL}/api/fill-in-gaps/?course_id=${cleanId}`, 'FILL');
      const popQ = await fetchSafe(`${BASE_URL}/api/pop-questions/?course_id=${cleanId}`, 'POP');
      const cbtQ = await fetchSafe(`${BASE_URL}/api/questions/?course_id=${cleanId}`, 'CBT');

      let combined = [];
      if (isStudyMode) {
        combined = [...cbtQ, ...fillQ, ...popQ]; // Show everything in Q&A
      } else {
        combined = format === 'POP' ? [...popQ, ...fillQ] : [...cbtQ, ...fillQ];
      }

      setQuestions(combined);
      setLoading(false);
    } catch (err) {
      setError('Failed to load questions.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examStarted && !submitted && !isStudyMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, submitted, isStudyMode]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let correct = 0;
    questions.forEach((q) => {
      const userAns = (selectedAnswers[String(q.id)] || '').trim().toLowerCase();
      const correctAns = (q.correct_answer || q.fill_answer || '').trim().toLowerCase();
      if (userAns && correctAns && userAns === correctAns) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={NOUN_GREEN} /></SafeAreaView>;

  // Start Screen
  if (!examStarted) {
    return (
      <SafeAreaView style={styles.startContainer}>
        <ScrollView contentContainerStyle={styles.startBody}>
          <View style={styles.startIconBox}><Text style={{ fontSize: 60 }}>📝</Text></View>
          <Text style={styles.startTitle}>Timed Mock Exam</Text>
          <Text style={styles.startSubtitle}>45 Minutes | {questions.length} Questions</Text>
          <View style={styles.rulesCard}>
             <Text style={styles.rulesTitle}>📋 Instructions</Text>
             <Text style={styles.ruleItem}>• Select answers and submit before time runs out.</Text>
             <Text style={styles.ruleItem}>• Reveal Answer is disabled until you finish.</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={() => setExamStarted(true)}>
            <Text style={styles.startBtnText}>Begin Exam 🚀</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Result Screen
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gradeCard}>
          <Text style={styles.gradeLetter}>{Math.round((score/questions.length)*100)}%</Text>
          <Text style={styles.gradeScore}>You got {score} out of {questions.length}</Text>
          <TouchableOpacity style={styles.btnGreen} onPress={() => router.back()}>
            <Text style={styles.btnText}>🏠 Back to Course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];
  const qId = String(currentQ?.id);
  const isCBT = currentQ?.qType === 'CBT';
  const isRevealed = revealed[qId] || isStudyMode;
  const correctAns = (currentQ?.correct_answer || currentQ?.answer_text || currentQ?.fill_answer || '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
      <View style={styles.examHeader}>
        <View>
          <Text style={styles.examQNum}>Question {currentIndex + 1}/{questions.length}</Text>
          <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${((currentIndex+1)/questions.length)*100}%` }]} /></View>
        </View>
        {!isStudyMode && (
          <View style={styles.timerPill}><Text style={styles.timerText}>⏱️ {formatTime(timeLeft)}</Text></View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQ?.question_text || currentQ?.text}</Text>

          {isCBT && ['a', 'b', 'c', 'd'].map((letter) => (
            <TouchableOpacity
              key={letter}
              style={[
                styles.option,
                selectedAnswers[qId] === letter && styles.optionSelected,
                isStudyMode && letter === (currentQ.correct_answer || '').toLowerCase() && styles.optionCorrect
              ]}
              onPress={() => !isRevealed && setSelectedAnswers({ ...selectedAnswers, [qId]: letter })}
              disabled={isRevealed && !isStudyMode}
            >
              <View style={[styles.optionLetterBox, selectedAnswers[qId] === letter && {backgroundColor: NOUN_GREEN}]}>
                <Text style={{color: selectedAnswers[qId] === letter ? '#fff' : '#333'}}>{letter.toUpperCase()}</Text>
              </View>
              <Text style={{flex:1}}>{currentQ[`option_${letter}`]}</Text>
            </TouchableOpacity>
          ))}

          {!isCBT && (
            <TextInput
              style={styles.popInput}
              multiline
              placeholder="Type your answer here..."
              value={selectedAnswers[qId] || ''}
              onChangeText={(text) => setSelectedAnswers({ ...selectedAnswers, [qId]: text })}
            />
          )}

          {isRevealed && (
            <View style={styles.answerBox}>
              <Text style={styles.answerBoxLabel}>✅ Correct Answer:</Text>
              <Text style={styles.answerBoxText}>{correctAns}</Text>
            </View>
          )}

          {!isStudyMode && !isRevealed && (
            <TouchableOpacity style={styles.revealBtn} onPress={() => setRevealed({...revealed, [qId]: true})}>
              <Text style={styles.revealBtnText}>💡 Reveal Answer</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex(c => Math.max(0, c - 1))}><Text style={styles.navBtnText}>← Prev</Text></TouchableOpacity>
        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitBtn} onPress={submitExam}><Text style={styles.submitBtnText}>Finish</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex(c => Math.min(questions.length - 1, c + 1))}><Text style={styles.navBtnText}>Next →</Text></TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  startContainer: { flex: 1, backgroundColor: '#fff' },
  startBody: { padding: 30, alignItems: 'center' },
  startIconBox: { width: 100, height: 100, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  startTitle: { fontSize: 28, fontWeight: 'bold', color: NOUN_GREEN },
  startSubtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  rulesCard: { backgroundColor: NOUN_LIGHT_GREEN, padding: 20, borderRadius: 15, width: '100%', marginBottom: 30 },
  rulesTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: NOUN_MID_GREEN },
  ruleItem: { fontSize: 14, color: '#444', marginBottom: 8 },
  startBtn: { backgroundColor: NOUN_GREEN, width: '100%', padding: 18, borderRadius: 15, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  examHeader: { backgroundColor: NOUN_GREEN, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examQNum: { color: '#fff', fontSize: 14, opacity: 0.9 },
  progressBarBg: { width: 120, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: 4 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  timerPill: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 16 },
  questionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  questionText: { fontSize: 19, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 28, marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 15, borderHeight: 2, borderColor: '#f0f0f0', borderRadius: 12, marginBottom: 12, backgroundColor: '#fafafa', borderWidth: 1 },
  optionSelected: { borderColor: NOUN_GREEN, backgroundColor: NOUN_LIGHT_GREEN },
  optionCorrect: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  optionLetterBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  popInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, minHeight: 120, backgroundColor: '#fafafa', textAlignVertical: 'top' },
  answerBox: { marginTop: 20, padding: 18, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: NOUN_GREEN },
  answerBoxLabel: { fontWeight: 'bold', color: NOUN_MID_GREEN, fontSize: 13, marginBottom: 4 },
  answerBoxText: { fontSize: 16, color: NOUN_GREEN, fontWeight: '600' },
  revealBtn: { marginTop: 15, padding: 12, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10 },
  revealBtnText: { color: '#666', fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  navBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#f5f5f5' },
  navBtnText: { fontWeight: 'bold', color: '#555' },
  submitBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, backgroundColor: NOUN_GREEN },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  gradeCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  gradeLetter: { fontSize: 70, fontWeight: 'bold', color: NOUN_GREEN, marginBottom: 10 },
  gradeScore: { fontSize: 18, color: '#666', marginBottom: 30 },
  btnGreen: { backgroundColor: NOUN_GREEN, padding: 16, borderRadius: 15, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});