import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SafeAreaView, ScrollView, TextInput, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BASE_URL = 'https://noun-study-buddy.onrender.com';
const NOUN_GREEN = '#006600';
const NOUN_LIGHT_GREEN = '#e8f5e9';
const NOUN_MID_GREEN = '#2e7d32';

export default function MockExamEngine() {
  const params = useLocalSearchParams(); 
  const router = useRouter();

  // 1. BULLETPROOF PARAMETER CHECK
  // This catches the exact mode whether it's on web or mobile
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

  // 🚀 3. THE MAGIC FIX: FORCE STATE RESET
  // Because Expo caches pages, we MUST reset everything when the URL changes.
  useEffect(() => {
    setExamStarted(isStudyMode); // Skip start screen ONLY if study mode
    setSubmitted(false);
    setScore(0);
    setTimeLeft(45 * 60);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealed({});
  }, [cleanId, isStudyMode, isPopFormat]);

  // 4. THE SAFE FETCHER
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

        const [mcqs, fills, pops] = await Promise.all([
          getData(`${BASE_URL}/api/questions/?course_id=${cleanId}`, 'CBT'),
          getData(`${BASE_URL}/api/fill-in-gaps/?course_id=${cleanId}`, 'FILL'),
          getData(`${BASE_URL}/api/pop-questions/?course_id=${cleanId}`, 'POP')
        ]);

        if (!isMounted) return;

        let all = [];
        if (isStudyMode) {
          all = [...mcqs, ...fills, ...pops]; // Study gets EVERYTHING
        } else {
          all = isPopFormat ? [...pops, ...fills] : [...mcqs, ...fills]; // Exam respects the format
        }

        setQuestions(all);
        setLoading(false);
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuestions();
    return () => { isMounted = false; };
  }, [cleanId, isStudyMode, isPopFormat]);

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

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let s = 0;
    questions.forEach(q => {
      const ans = (selectedAnswers[q.id] || '').trim().toLowerCase();
      const correct = (q.correct_answer || q.fill_answer || q.answer_text || '').trim().toLowerCase();
      if (ans === correct && ans !== '') s++;
    });
    setScore(s);
    setSubmitted(true);
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={NOUN_GREEN} /></SafeAreaView>;

  // 6. START SCREEN (Hidden in Study Mode)
  if (!examStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.startBody}>
          <View style={styles.iconCircle}><Text style={{fontSize: 50}}>📝</Text></View>
          <Text style={styles.startTitle}>Timed Mock Exam</Text>
          <Text style={styles.startSub}>45 Minutes | {questions.length} Questions</Text>
          <Text style={{color: '#666', fontWeight: 'bold', marginBottom: 20}}>
            Format: {isPopFormat ? 'POP (Theory/Fill-in)' : 'CBT (Multiple Choice)'}
          </Text>
          <View style={styles.rules}>
            <Text style={styles.ruleTxt}>• Answers are hidden until submission.</Text>
            <Text style={styles.ruleTxt}>• Timer auto-submits at 00:00.</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={() => setExamStarted(true)}>
            <Text style={styles.startBtnText}>Begin Exam 🚀</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 7. RESULT SCREEN
  if (submitted) {
     return (
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Text style={{fontSize: 50, fontWeight: 'bold', color: NOUN_GREEN}}>{score} / {questions.length}</Text>
            <Text style={{fontSize: 18, color: '#666', marginBottom: 30}}>Exam Completed</Text>
            <TouchableOpacity onPress={() => router.back()} style={[styles.startBtn, {width: '80%'}]}>
               <Text style={styles.startBtnText}>Back to Course</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
     );
  }

  const currentQ = questions[currentIndex];
  const qId = String(currentQ?.id);
  const isCBT = currentQ?.qType === 'CBT';
  const showAnswer = revealed[qId] || isStudyMode;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NOUN_GREEN} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerText}>Question {currentIndex + 1}/{questions.length || 1}</Text>
          <View style={styles.progressBg}><View style={[styles.progressFill, {width: `${((currentIndex+1)/(questions.length||1))*100}%`}]} /></View>
        </View>
        {!isStudyMode && (
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>⏱️ {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.questionCard}>
          <Text style={styles.qText}>{currentQ?.question_text || currentQ?.text}</Text>

          {isCBT && ['a', 'b', 'c', 'd'].map(l => (
            <TouchableOpacity 
              key={l}
              style={[
                styles.opt, 
                selectedAnswers[qId] === l && styles.optSelected,
                isStudyMode && l === (currentQ.correct_answer||'').toLowerCase() && styles.optCorrect
              ]}
              onPress={() => !showAnswer && setSelectedAnswers({...selectedAnswers, [qId]: l})}
              disabled={showAnswer && !isStudyMode}
            >
              <View style={[styles.letterBox, selectedAnswers[qId] === l && {backgroundColor: NOUN_GREEN}]}>
                <Text style={{color: selectedAnswers[qId] === l ? '#fff' : '#333'}}>{l.toUpperCase()}</Text>
              </View>
              <Text style={{flex: 1}}>{currentQ[`option_${l}`]}</Text>
            </TouchableOpacity>
          ))}

          {!isCBT && (
            <TextInput 
              style={styles.input} 
              multiline 
              placeholder="Type your answer here..." 
              value={selectedAnswers[qId]||''} 
              onChangeText={t => setSelectedAnswers({...selectedAnswers, [qId]: t})}
            />
          )}

          {showAnswer && (
            <View style={styles.ansBox}>
              <Text style={styles.ansLabel}>Correct Answer:</Text>
              <Text style={styles.ansText}>{currentQ?.correct_answer || currentQ?.fill_answer || currentQ?.answer_text}</Text>
            </View>
          )}

          {!isStudyMode && !showAnswer && (
            <TouchableOpacity onPress={() => setRevealed({...revealed, [qId]: true})} style={{marginTop: 15, alignItems: 'center'}}>
              <Text style={{color: '#666', fontWeight: 'bold'}}>💡 Reveal Answer</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex(c => Math.max(0, c-1))}><Text>Prev</Text></TouchableOpacity>
        {currentIndex === (questions.length - 1) ? (
          <TouchableOpacity style={styles.submitBtn} onPress={submitExam}><Text style={{color:'#fff', fontWeight:'bold'}}>Finish</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentIndex(c => Math.min(questions.length-1, c+1))}><Text>Next</Text></TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: NOUN_GREEN, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 40 },
  headerText: { color: '#fff', fontSize: 14, opacity: 0.8 },
  progressBg: { width: 100, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 5 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  timerBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 20 },
  timerText: { color: '#fff', fontWeight: 'bold' },
  questionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  qText: { fontSize: 19, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 26, marginBottom: 20 },
  opt: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 10, backgroundColor: '#fafafa' },
  optSelected: { borderColor: NOUN_GREEN, backgroundColor: NOUN_LIGHT_GREEN },
  optCorrect: { borderColor: NOUN_MID_GREEN, backgroundColor: '#e8f5e9' },
  letterBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, minHeight: 100, backgroundColor: '#fafafa', textAlignVertical: 'top' },
  ansBox: { marginTop: 20, padding: 15, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: NOUN_GREEN },
  ansLabel: { fontSize: 12, fontWeight: 'bold', color: NOUN_MID_GREEN, marginBottom: 4 },
  ansText: { fontSize: 16, color: NOUN_GREEN, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  navBtn: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 10, minWidth: 80, alignItems: 'center' },
  submitBtn: { padding: 12, backgroundColor: NOUN_GREEN, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  startBody: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 100, height: 100, backgroundColor: NOUN_LIGHT_GREEN, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  startTitle: { fontSize: 26, fontWeight: 'bold', color: NOUN_GREEN },
  startSub: { color: '#666', marginBottom: 10 },
  rules: { backgroundColor: NOUN_LIGHT_GREEN, padding: 20, borderRadius: 15, width: '100%', marginBottom: 30 },
  ruleTxt: { color: NOUN_MID_GREEN, marginBottom: 5 },
  startBtn: { backgroundColor: NOUN_GREEN, width: '100%', padding: 18, borderRadius: 15, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});