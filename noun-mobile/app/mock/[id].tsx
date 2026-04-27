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

// 🎨 TRUE NOUN GREEN 
const NOUN_GREEN = '#006600'; 
const NOUN_LIGHT_GREEN = '#e8f5e9';
const NOUN_MID_GREEN = '#2e7d32';

export default function MockExamEngine() {
  const { id, format } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60);
  const [examStarted, setExamStarted] = useState(false);
  const timerRef = useRef<any>(null);

  // ─── Fetch Questions ──────────────────────────────────────────────────
  useEffect(() => {
    fetchQuestions();
  }, [id, format]);

  const fetchQuestions = async () => {
    try {
      const cleanId = String(id).split('?')[0];
      const isPOP = format === 'POP' || String(id).includes('format=POP');
      
      let allQuestions: any[] = [];

      if (isPOP) {
        // 1. Fetch POP Theory Questions
        const popRes = await fetch(`${BASE_URL}/api/courses/${cleanId}/pop-questions/`);
        if (popRes.ok) {
          const popData = await popRes.json();
          const popQ = Array.isArray(popData) ? popData.map((q: any) => ({ ...q, qType: 'POP' })) : [];
          allQuestions = [...allQuestions, ...popQ];
        }

        // 2. Fetch Fill-in-the-gap Questions
        const fillRes = await fetch(`${BASE_URL}/api/fill-in-gaps/?course_id=${cleanId}`);
        if (fillRes.ok) {
          const fillData = await fillRes.json();
          const fillQ = Array.isArray(fillData) ? fillData.map((q: any) => ({ ...q, qType: 'FILL' })) : [];
          allQuestions = [...allQuestions, ...fillQ];
        }
      } else {
        // 3. 🚀 FIXED: Fetch Multiple Choice from its dedicated Django endpoint!
        const mcqRes = await fetch(`${BASE_URL}/api/questions/?course_id=${cleanId}`);
        if (mcqRes.ok) {
          const mcqData = await mcqRes.json();
          const mcqQ = Array.isArray(mcqData) ? mcqData.map((q: any) => ({ ...q, qType: 'CBT' })) : [];
          allQuestions = [...allQuestions, ...mcqQ];
        }

        // 4. Fetch Fill-in-the-gap for CBT
        const fillRes = await fetch(`${BASE_URL}/api/fill-in-gaps/?course_id=${cleanId}`);
        if (fillRes.ok) {
          const fillData = await fillRes.json();
          const fillQ = Array.isArray(fillData) ? fillData.map((q: any) => ({ ...q, qType: 'FILL' })) : [];
          allQuestions = [...allQuestions, ...fillQ];
        }
      }

      setQuestions(allQuestions);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load questions. Check your connection.');
      setLoading(false);
    }
  };

  // ─── Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (examStarted && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (Platform.OS === 'web') {
              window.alert("Time's Up! Submitting your exam automatically.");
            } else {
              Alert.alert("Time's Up!", "Your 45 minutes are over. Submitting exam now.");
            }
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerColor = () => {
    if (timeLeft > 600) return '#4caf50';
    if (timeLeft > 300) return '#ff9800';
    return '#f44336';
  };

  // ─── Submit Logic ─────────────────────────────────────────────────────
  const confirmSubmit = () => {
    const unanswered = questions.length - Object.keys(selectedAnswers).length;
    const msg = unanswered > 0 
      ? `You have ${unanswered} unanswered question(s). Submit anyway?` 
      : `Are you sure you want to submit your answers?`;

    // 🚀 FIXED: Allow Submit button to work on Web/Laptops!
    if (Platform.OS === 'web') {
      const confirm = window.confirm(msg);
      if (confirm) submitExam();
      return;
    }

    Alert.alert('Submit Exam?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: submitExam },
    ]);
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let correct = 0;
    questions.forEach((q) => {
      const userAns = (selectedAnswers[String(q.id)] || '').trim().toLowerCase();
      // 🚀 FIXED: Finds the correct answer no matter what your Django database calls it
      const correctAns = (q.correct_answer || q.answer_text || q.fill_answer || q.answer || '').trim().toLowerCase();
      if (userAns && correctAns && userAns === correctAns) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  // ─── UI Styling Logic ─────────────────────────────────────────────────
  const getOptionStyle = (q: any, letter: string): any => {
    const isSelected = selectedAnswers[String(q.id)] === letter;
    const isRevealed = revealed[String(q.id)];
    const correct = (q.correct_answer || '').toLowerCase();

    if (isRevealed) {
      if (letter === correct) return [styles.option, styles.optionCorrect];
      if (isSelected && letter !== correct) return [styles.option, styles.optionWrong];
    }
    if (isSelected) return [styles.option, styles.optionSelected];
    return styles.option;
  };

  const getOptionTextStyle = (q: any, letter: string): any => {
    const isSelected = selectedAnswers[String(q.id)] === letter;
    const isRevealed = revealed[String(q.id)];
    const correct = (q.correct_answer || '').toLowerCase();

    if (isRevealed) {
      if (letter === correct) return styles.optionTextCorrect;
      if (isSelected && letter !== correct) return styles.optionTextWrong;
    }
    if (isSelected) return styles.optionTextSelected;
    return styles.optionText;
  };

  // ─── LOADING ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={NOUN_GREEN} />
        <Text style={styles.loadingText}>Loading exam...</Text>
      </SafeAreaView>
    );
  }

  // ─── ERROR ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btnGreen} onPress={fetchQuestions}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── NO QUESTIONS ─────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontSize: 50, marginBottom: 15 }}>📭</Text>
        <Text style={styles.emptyTitle}>No Questions Yet</Text>
        <Text style={styles.emptySubtitle}>Questions for this course are being generated. Check back soon!</Text>
        <TouchableOpacity style={styles.btnGreen} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── START SCREEN (Your Beautiful UI) ───────────────────────────────
  if (!examStarted) {
    const cbtCount = questions.filter((q) => q.qType === 'CBT').length;
    const fillCount = questions.filter((q) => q.qType === 'FILL').length;
    const popCount = questions.filter((q) => q.qType === 'POP').length;

    return (
      <SafeAreaView style={styles.startContainer}>
        <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
        <View style={styles.startHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.startHeaderTitle}>Mock Exam</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.startBody}>
          <View style={styles.startIconBox}><Text style={{ fontSize: 60 }}>📝</Text></View>
          <Text style={styles.startTitle}>NOUN CBT Practice</Text>
          <Text style={styles.startSubtitle}>{format === 'POP' ? 'POP (Pen-On-Paper) Exam' : 'CBT (Computer-Based Test)'}</Text>

          <View style={styles.statsRow}>
            {cbtCount > 0 && <View style={styles.statCard}><Text style={styles.statNum}>{cbtCount}</Text><Text style={styles.statLabel}>MCQ</Text></View>}
            {fillCount > 0 && <View style={styles.statCard}><Text style={styles.statNum}>{fillCount}</Text><Text style={styles.statLabel}>Fill Gap</Text></View>}
            {popCount > 0 && <View style={styles.statCard}><Text style={styles.statNum}>{popCount}</Text><Text style={styles.statLabel}>Theory</Text></View>}
            <View style={styles.statCard}><Text style={styles.statNum}>{EXAM_MINUTES}</Text><Text style={styles.statLabel}>Minutes</Text></View>
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>📋 Instructions</Text>
            {[
              'Select one answer per MCQ question',
              'Type your answer for fill-in-gap questions',
              'Use "Reveal Answer" to check the correct answer',
              'Timer starts when you tap Begin',
              'Exam auto-submits when time runs out',
            ].map((rule, i) => <Text key={i} style={styles.ruleItem}>• {rule}</Text>)}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={() => setExamStarted(true)} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>Begin Exam 🚀</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── RESULTS SCREEN ───────────────────────────────────────────────────
  if (submitted) {
    const percent = Math.round((score / questions.length) * 100);
    const getGrade = () => {
      if (percent >= 70) return { g: 'A', msg: 'Excellent! 🎉', color: '#2e7d32' };
      if (percent >= 60) return { g: 'B', msg: 'Good Job! 👍', color: '#1565c0' };
      if (percent >= 50) return { g: 'C', msg: 'You Passed! 📚', color: '#e65100' };
      if (percent >= 45) return { g: 'D', msg: 'Just Passed 📖', color: '#bf360c' };
      return { g: 'F', msg: "Don't Give Up! 💪", color: '#b71c1c' };
    };
    const { g, msg, color } = getGrade();

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsHeaderTitle}>Exam Results</Text>
        </View>
        <ScrollView contentContainerStyle={styles.resultsBody}>
          <View style={styles.gradeCard}>
            <Text style={[styles.gradeLetter, { color }]}>{g}</Text>
            <Text style={styles.gradeScore}>{score}/{questions.length}</Text>
            <Text style={styles.gradePercent}>{percent}%</Text>
            <Text style={[styles.gradeMsg, { color }]}>{msg}</Text>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={[styles.resultStat, { borderColor: '#4caf50' }]}>
              <Text style={[styles.resultStatNum, { color: '#2e7d32' }]}>{score}</Text>
              <Text style={styles.resultStatLabel}>Correct ✅</Text>
            </View>
            <View style={[styles.resultStat, { borderColor: '#f44336' }]}>
              <Text style={[styles.resultStatNum, { color: '#c62828' }]}>{questions.length - score}</Text>
              <Text style={styles.resultStatLabel}>Wrong ❌</Text>
            </View>
            <View style={[styles.resultStat, { borderColor: '#9e9e9e' }]}>
              <Text style={[styles.resultStatNum, { color: '#424242' }]}>{questions.length - Object.keys(selectedAnswers).length}</Text>
              <Text style={styles.resultStatLabel}>Skipped ⏭️</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnGreen}
            onPress={() => {
              setSubmitted(false); setSelectedAnswers({}); setRevealed({});
              setScore(0); setCurrentIndex(0); setTimeLeft(EXAM_MINUTES * 60); setExamStarted(false);
            }}
          >
            <Text style={styles.btnText}>🔄 Retake Exam</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnOutline, { marginTop: 12 }]} onPress={() => router.back()}>
            <Text style={styles.btnOutlineText}>🏠 Back to Course</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── EXAM SCREEN ──────────────────────────────────────────────────────
  const currentQ = questions[currentIndex];
  const qId = String(currentQ?.id);
  const isCBT = currentQ?.qType === 'CBT';
  const isFill = currentQ?.qType === 'FILL';
  const isPOP = currentQ?.qType === 'POP';
  const isRevealed = revealed[qId];
  
  // 🚀 FIXED: Ensures POP answers are found and displayed in the green box
  const correctAns = (currentQ?.correct_answer || currentQ?.answer_text || currentQ?.fill_answer || currentQ?.answer || '');
  
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />

      <View style={styles.examHeader}>
        <View>
          <Text style={styles.examQNum}>Question {currentIndex + 1}/{questions.length}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
        <View style={[styles.timerPill, { borderColor: getTimerColor() }]}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>⏱️ {formatTime(timeLeft)}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={styles.questionCard}>
          <View style={[styles.typeBadge, isCBT && styles.typeCBT, isFill && styles.typeFill, isPOP && styles.typePOP]}>
            <Text style={styles.typeBadgeText}>
              {isCBT ? 'Multiple Choice' : isFill ? 'Fill in the Gap' : 'Theory Question'}
            </Text>
          </View>

          <Text style={styles.questionText}>
            {currentQ?.question_text || currentQ?.text}
          </Text>

          {isCBT && ['a', 'b', 'c', 'd'].map((letter) => {
            const optionText = currentQ[`option_${letter}`];
            if (!optionText) return null;
            return (
              <TouchableOpacity
                key={letter}
                style={getOptionStyle(currentQ, letter)}
                onPress={() => !isRevealed && setSelectedAnswers({ ...selectedAnswers, [qId]: letter })}
                activeOpacity={0.75}
                disabled={isRevealed}
              >
                <View style={[
                  styles.optionLetterBox,
                  selectedAnswers[qId] === letter && styles.optionLetterBoxActive,
                  isRevealed && letter === correctAns.toLowerCase() && styles.optionLetterBoxCorrect,
                ]}>
                  <Text style={[
                    styles.optionLetter,
                    (selectedAnswers[qId] === letter || (isRevealed && letter === correctAns.toLowerCase())) && { color: '#fff' },
                  ]}>
                    {letter.toUpperCase()}
                  </Text>
                </View>
                <Text style={getOptionTextStyle(currentQ, letter)}>
                  {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}

          {isFill && (
            <TextInput
              style={[styles.fillInput, isRevealed && styles.fillInputDisabled]}
              placeholder="Type your answer here..."
              placeholderTextColor="#aaa"
              value={selectedAnswers[qId] || ''}
              onChangeText={(text) => !isRevealed && setSelectedAnswers({ ...selectedAnswers, [qId]: text })}
              editable={!isRevealed}
            />
          )}

          {isPOP && (
            <TextInput
              style={[styles.popInput, isRevealed && styles.fillInputDisabled]}
              placeholder="Write your theory answer here..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={6}
              value={selectedAnswers[qId] || ''}
              onChangeText={(text) => !isRevealed && setSelectedAnswers({ ...selectedAnswers, [qId]: text })}
              editable={!isRevealed}
              textAlignVertical="top"
            />
          )}

          {!isRevealed ? (
            <TouchableOpacity style={styles.revealBtn} onPress={() => setRevealed({ ...revealed, [qId]: true })}>
              <Text style={styles.revealBtnText}>💡 Reveal Answer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.answerBox}>
              <Text style={styles.answerBoxLabel}>✅ Correct Answer:</Text>
              <Text style={styles.answerBoxText}>
                {isCBT
                  ? `${(correctAns).toUpperCase().replace('OPTION ', '')}. ${currentQ[`option_${correctAns.toLowerCase().replace('option ', '')}`] || correctAns}`
                  : correctAns || 'No answer uploaded in database yet.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} disabled={currentIndex === 0} onPress={() => setCurrentIndex((c) => c - 1)}>
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitBtn} onPress={confirmSubmit}>
            <Text style={styles.submitBtnText}>Submit Exam ✅</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex((c) => c + 1)}>
            <Text style={styles.navBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f0', padding: 30 },
  loadingText: { marginTop: 12, color: NOUN_GREEN, fontSize: 16 },
  errorEmoji: { fontSize: 50, marginBottom: 12 },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: NOUN_GREEN, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 22 },

  startContainer: { flex: 1, backgroundColor: '#f0f4f0' },
  startHeader: { backgroundColor: NOUN_GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  backIcon: { width: 40, height: 40, justifyContent: 'center' },
  startHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  startBody: { padding: 24, alignItems: 'center' },
  startIconBox: { width: 100, height: 100, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  startTitle: { fontSize: 26, fontWeight: '800', color: NOUN_GREEN, marginBottom: 4 },
  startSubtitle: { fontSize: 15, color: '#666', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  statCard: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', minWidth: 80, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statNum: { fontSize: 24, fontWeight: '800', color: NOUN_GREEN },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  rulesCard: { width: '100%', backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 16, padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: NOUN_GREEN },
  rulesTitle: { fontSize: 16, fontWeight: '700', color: NOUN_GREEN, marginBottom: 10 },
  ruleItem: { fontSize: 14, color: NOUN_MID_GREEN, lineHeight: 26 },
  startBtn: { width: '100%', backgroundColor: NOUN_GREEN, borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: NOUN_GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  examHeader: { backgroundColor: NOUN_GREEN, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examQNum: { color: '#a8d5b5', fontSize: 13, marginBottom: 6 },
  progressBarBg: { width: 160, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4caf50', borderRadius: 3 },
  timerPill: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  timerText: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },

  scrollContent: { padding: 16, paddingBottom: 40 },
  questionCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  typeCBT: { backgroundColor: '#e3f2fd' },
  typeFill: { backgroundColor: '#fff3e0' },
  typePOP: { backgroundColor: '#fce4ec' },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: '#333' },
  questionText: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', lineHeight: 26, marginBottom: 18 },

  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#eee', backgroundColor: '#fafafa', marginBottom: 10 },
  optionSelected: { borderColor: NOUN_GREEN, backgroundColor: NOUN_LIGHT_GREEN },
  optionCorrect: { borderColor: '#4caf50', backgroundColor: '#e8f5e9' },
  optionWrong: { borderColor: '#f44336', backgroundColor: '#ffebee' },
  optionLetterBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  optionLetterBoxActive: { backgroundColor: NOUN_GREEN },
  optionLetterBoxCorrect: { backgroundColor: '#4caf50' },
  optionLetter: { fontWeight: '700', fontSize: 14, color: '#555' },
  optionText: { fontSize: 15, color: '#333', flex: 1, lineHeight: 22 },
  optionTextSelected: { color: NOUN_GREEN, fontWeight: '600', flex: 1, lineHeight: 22 },
  optionTextCorrect: { color: '#2e7d32', fontWeight: '600', flex: 1, lineHeight: 22 },
  optionTextWrong: { color: '#c62828', fontWeight: '600', flex: 1, lineHeight: 22 },

  fillInput: { borderWidth: 2, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 12, color: '#333' },
  fillInputDisabled: { backgroundColor: '#f5f5f5', borderColor: '#eee' },
  popInput: { borderWidth: 2, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 12, minHeight: 160, color: '#333' },

  revealBtn: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: '#e0f2f1', alignItems: 'center', borderWidth: 1, borderColor: '#80cbc4' },
  revealBtnText: { color: '#00695c', fontWeight: '700', fontSize: 15 },
  answerBox: { marginTop: 12, padding: 16, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 12, borderWidth: 1, borderColor: '#81c784' },
  answerBoxLabel: { fontSize: 13, color: NOUN_MID_GREEN, fontWeight: '700', marginBottom: 6 },
  answerBoxText: { fontSize: 16, color: NOUN_GREEN, fontWeight: '600', lineHeight: 24 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  navBtn: { backgroundColor: '#f0f0f0', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontWeight: '700', color: '#555', fontSize: 15 },
  submitBtn: { backgroundColor: NOUN_GREEN, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 140, alignItems: 'center', shadowColor: NOUN_GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resultsHeader: { backgroundColor: NOUN_GREEN, padding: 20, alignItems: 'center' },
  resultsHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  resultsBody: { padding: 20, alignItems: 'center' },
  gradeCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  gradeLetter: { fontSize: 80, fontWeight: '900', letterSpacing: -2 },
  gradeScore: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  gradePercent: { fontSize: 16, color: '#888', marginTop: 2 },
  gradeMsg: { fontSize: 18, fontWeight: '600', marginTop: 10 },
  resultStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  resultStat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2 },
  resultStatNum: { fontSize: 28, fontWeight: '800' },
  resultStatLabel: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },

  btnGreen: { width: '100%', backgroundColor: NOUN_GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: NOUN_GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { width: '100%', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: NOUN_GREEN },
  btnOutlineText: { color: NOUN_GREEN, fontSize: 16, fontWeight: '700' },
});