import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SafeAreaView, ScrollView, TextInput, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = 'https://noun-study-buddy-1.onrender.com';

export default function MockExamEngine() {
  const params = useLocalSearchParams(); 
  const router = useRouter();
  const { colors } = useTheme();

  // 1. ROUTING PARAMS
  const urlStr = typeof window !== 'undefined' ? window.location.href : '';
  const isStudyMode = urlStr.includes('mode=study') || params.mode === 'study';
  const isPopFormat = urlStr.includes('format=POP') || params.format === 'POP';
  const cleanId = String(params.id || '').split('?')[0];

  // 2. STATE
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [examStarted, setExamStarted] = useState(isStudyMode);
  
  const timerRef = useRef<any>(null);

  // 3. FORCE STATE RESET ON NAVIGATION
  useEffect(() => {
    setExamStarted(isStudyMode); 
    setSubmitted(false);
    setScore(0);
    setTimeLeft(45 * 60);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealed({});
  }, [cleanId, isStudyMode, isPopFormat]);

  // 4. FETCH QUESTIONS BASED ON FORMAT
  useEffect(() => {
    let isMounted = true;
    if (!cleanId) return;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const getData = async (url: string, type: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.results || []);
            return list.map((q: any) => ({ ...q, qType: type }));
          } catch (e) { return []; }
        };

        let all: any[] = [];

        if (isPopFormat) {
          const [pops] = await Promise.all([
            getData(`${BASE_URL}/api/pop-questions/?course_id=${cleanId}`, 'POP')
          ]);
          all = [...pops];
        } else {
          const [mcqs, fills] = await Promise.all([
            getData(`${BASE_URL}/api/questions/?course_id=${cleanId}`, 'CBT'),
            getData(`${BASE_URL}/api/fill-in-gaps/?course_id=${cleanId}`, 'FILL')
          ]);
          all = [...mcqs, ...fills];
        }

        if (!isMounted) return;
        
        if (!isStudyMode) {
          all = all.sort(() => Math.random() - 0.5);
        }
        
        setQuestions(all);
        setLoading(false);

      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuestions();
    return () => { isMounted = false; };
  }, [cleanId, isPopFormat, isStudyMode]);

  // 5. THE TIMER
  useEffect(() => {
    if (examStarted && !submitted && !isStudyMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) {
            clearInterval(timerRef.current);
            submitExam();
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, submitted, isStudyMode]);

  const { isLoggedIn, token } = useAuth(); // ADD THIS to access auth

  const submitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let s = 0;
    const questionResults: any[] = [];

    questions.forEach(q => {
      const userAnswer = (selectedAnswers[q.id] || '').trim().toLowerCase();
      let isCorrect = false;

      if (!userAnswer) {
        // Did not answer
      } else if (q.qType === 'CBT') {
        const correctLetter = (q.correct_answer || '').trim().toLowerCase();
        if (userAnswer === correctLetter) {
          s++;
          isCorrect = true;
        }
      } else if (q.qType === 'FILL') {
        const correctText = (q.correct_answer || '').trim().toLowerCase();
        if (userAnswer === correctText) {
          s++;
          isCorrect = true;
        }
      }

      questionResults.push({
        question_id: q.id,
        question_type: q.qType,
        is_correct: isCorrect
      });
    });

    setScore(s);
    setSubmitted(true);

    // If logged in and not in study mode, save progress to backend
    if (isLoggedIn && token && !isStudyMode) {
      try {
        await fetch(`${BASE_URL}/api/attempts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          },
          body: JSON.stringify({
            course_id: cleanId,
            score: s,
            total_questions: questions.length,
            time_taken_seconds: (45 * 60) - timeLeft,
            question_results: questionResults
          })
        });
      } catch (err) {
        console.error('Failed to save exam attempt:', err);
      }
    }
  };

  if (loading) return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></SafeAreaView>;

  // 6. START SCREEN (Hidden in Study Mode)
  if (!examStarted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.startBody}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}><Text style={{fontSize: 50}}>📝</Text></View>
          <Text style={[styles.startTitle, { color: colors.accent }]}>Timed Mock Exam</Text>
          <Text style={[styles.startSub, { color: colors.textSecondary }]}>45 Minutes | {questions.length} Questions</Text>
          <Text style={{color: colors.textSecondary, fontWeight: 'bold', marginBottom: 20}}>
            Format: {isPopFormat ? 'POP (Theory)' : 'CBT (Multiple Choice)'}
          </Text>
          <View style={[styles.rules, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.ruleTxt, { color: colors.accentMid }]}>• Answers are hidden until submission.</Text>
            <Text style={[styles.ruleTxt, { color: colors.accentMid }]}>• Timer auto-submits at 00:00.</Text>
          </View>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.accent }]} onPress={() => setExamStarted(true)}>
            <Text style={styles.startBtnText}>Begin Exam 🚀</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 7. RESULT SCREEN
  if (submitted) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{fontSize: 60, marginBottom: 10}}>{pct >= 70 ? '🎉' : pct >= 50 ? '😊' : '😢'}</Text>
          <Text style={{fontSize: 50, fontWeight: 'bold', color: colors.accent}}>{score} / {questions.length}</Text>
          <Text style={{fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 8}}>{pct}%</Text>
          <Text style={{fontSize: 16, color: colors.textSecondary, marginBottom: 30, marginTop: 4}}>
            {pct >= 70 ? 'Excellent! Keep it up!' : pct >= 50 ? 'Good effort. Practice more!' : 'Don\'t give up. Try again!'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.startBtn, { width: '80%', backgroundColor: colors.accent }]}>
             <Text style={styles.startBtnText}>Back to Course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];
  const qId = String(currentQ?.id);
  const isCBT = currentQ?.qType === 'CBT';
  const isFill = currentQ?.qType === 'FILL';
  const hasAnswered = !!selectedAnswers[qId];
  
  let showAnswer = false;
  if (isStudyMode) {
    if (revealed[qId] !== undefined) {
      showAnswer = revealed[qId];
    } else {
      showAnswer = hasAnswered || currentQ?.qType === 'POP';
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View>
          <Text style={styles.headerText}>Question {currentIndex + 1}/{questions.length || 1}</Text>
          <View style={[styles.progressBg, { backgroundColor: colors.progressBg }]}><View style={[styles.progressFill, { width: `${((currentIndex+1)/(questions.length||1))*100}%`, backgroundColor: colors.progressFill }]} /></View>
        </View>
        {!isStudyMode && (
          <View style={[styles.timerBox, { backgroundColor: colors.timerBg }]}>
            <Text style={styles.timerText}>⏱️ {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={[styles.questionCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.qText, { color: colors.text }]}>{currentQ?.question_text || currentQ?.text}</Text>

          {isCBT && ['a', 'b', 'c', 'd'].map(l => {
            const isSelected = selectedAnswers[qId] === l;
            const isCorrect = l === (currentQ.correct_answer || '').toLowerCase();
            const showCorrectHighlight = showAnswer && isCorrect;
            const showWrongHighlight = showAnswer && isSelected && !isCorrect;
            return (
              <TouchableOpacity 
                key={l}
                style={[
                  styles.opt, 
                  { backgroundColor: colors.optionBg, borderColor: colors.optionBorder },
                  isSelected && { borderColor: colors.accent, backgroundColor: colors.accentLight },
                  showCorrectHighlight && { borderColor: colors.accentMid, backgroundColor: colors.answerBg },
                  showWrongHighlight && { borderColor: colors.error, backgroundColor: colors.errorLight },
                ]}
                onPress={() => {
                  if (!hasAnswered || !isStudyMode) {
                    setSelectedAnswers({...selectedAnswers, [qId]: l});
                  }
                }}
                disabled={showAnswer && !isStudyMode}
              >
                <View style={[styles.letterBox, { backgroundColor: isSelected ? colors.accent : colors.optionBorder }, isSelected && {backgroundColor: colors.accent}]}>
                  <Text style={{color: isSelected ? '#fff' : colors.text}}>{l.toUpperCase()}</Text>
                </View>
                <Text style={{flex: 1, color: colors.text}}>{currentQ[`option_${l}`]}</Text>
              </TouchableOpacity>
            );
          })}

          {!isCBT && (
            <TextInput 
              style={[styles.input, { borderColor: colors.optionBorder, backgroundColor: colors.inputBg, color: colors.text }]} 
              multiline 
              placeholder="Type your answer here..." 
              placeholderTextColor={colors.textMuted}
              value={selectedAnswers[qId]||''} 
              onChangeText={t => setSelectedAnswers({...selectedAnswers, [qId]: t})}
            />
          )}

          {showAnswer && (
            <View style={[styles.ansBox, { backgroundColor: colors.answerBg, borderLeftColor: colors.accent }]}>
              <Text style={[styles.ansLabel, { color: colors.accentMid }]}>Correct Answer:</Text>
              <Text style={[styles.ansText, { color: colors.accent }]}>
                {isCBT 
                  ? `${(currentQ?.correct_answer || '').toUpperCase()}. ${currentQ?.[`option_${(currentQ?.correct_answer || 'a').toLowerCase()}`] || ''}`
                  : (currentQ?.correct_answer || currentQ?.answer_text || 'N/A')}
              </Text>
            </View>
          )}

          {isStudyMode && (
            <TouchableOpacity onPress={() => setRevealed({...revealed, [qId]: !showAnswer})} style={{marginTop: 15, alignItems: 'center'}}>
              <Text style={{color: colors.textMuted, fontWeight: 'bold'}}>
                {showAnswer ? '🙈 Hide Answer' : '💡 Reveal Answer'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.optionBg }]} onPress={() => setCurrentIndex(c => Math.max(0, c-1))}>
          <Text style={{ color: colors.text }}>Prev</Text>
        </TouchableOpacity>
        {currentIndex === (questions.length - 1) ? (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={submitExam}>
            <Text style={{color:'#fff', fontWeight:'bold'}}>Finish</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.optionBg }]} onPress={() => setCurrentIndex(c => Math.min(questions.length-1, c+1))}>
            <Text style={{ color: colors.text }}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 40 },
  headerText: { color: '#fff', fontSize: 14, opacity: 0.8 },
  progressBg: { width: 100, height: 4, borderRadius: 2, marginTop: 5 },
  progressFill: { height: '100%', borderRadius: 2 },
  timerBox: { padding: 8, borderRadius: 20 },
  timerText: { color: '#fff', fontWeight: 'bold' },
  questionCard: { padding: 20, borderRadius: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10 },
  qText: { fontSize: 19, fontWeight: 'bold', lineHeight: 26, marginBottom: 20 },
  opt: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  letterBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, minHeight: 100, textAlignVertical: 'top' },
  ansBox: { marginTop: 20, padding: 15, borderRadius: 12, borderLeftWidth: 5 },
  ansLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  ansText: { fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderTopWidth: 1 },
  navBtn: { padding: 12, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  submitBtn: { padding: 12, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  startBody: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  startTitle: { fontSize: 26, fontWeight: 'bold' },
  startSub: { marginBottom: 10 },
  rules: { padding: 20, borderRadius: 15, width: '100%', marginBottom: 30 },
  ruleTxt: { marginBottom: 5 },
  startBtn: { width: '100%', padding: 18, borderRadius: 15, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});