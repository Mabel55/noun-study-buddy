import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Swiper from 'react-native-deck-swiper';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

export default function FlashcardsScreen() {
  const { courseId } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/courses/${courseId}/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // Just take the CBT questions for flashcards
        const qList = (data.cbt_questions || []).map((q: any) => ({
          ...q,
          type: 'cbt'
        }));
        // Shuffle them
        setQuestions(qList.sort(() => 0.5 - Math.random()).slice(0, 20)); // Max 20 cards
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [courseId, token]);

  const handleSwipedRight = (index: number) => {
    setScore(s => ({ ...s, correct: s.correct + 1 }));
    // Ideally log this attempt to backend
  };

  const handleSwipedLeft = (index: number) => {
    setScore(s => ({ ...s, incorrect: s.incorrect + 1 }));
    // Ideally log this attempt to backend
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[styles.noCardsText, { color: colors.text }]}>No questions available for this course to generate flashcards.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>🎉</Text>
        <Text style={[styles.finishTitle, { color: colors.text }]}>You finished!</Text>
        <Text style={[styles.finishScore, { color: colors.textSecondary }]}>
          Got {score.correct} right, {score.incorrect} to review.
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back to Course</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.swiperContainer}>
        <Swiper
          cards={questions}
          renderCard={(card) => {
            if (!card) return <View/>;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#888' }]}>
                <Text style={[styles.cardQuestion, { color: colors.text }]}>{card.text}</Text>
                
                <View style={styles.optionsList}>
                  <Text style={[styles.optionText, { color: colors.textSecondary }]}>A. {card.option_a}</Text>
                  <Text style={[styles.optionText, { color: colors.textSecondary }]}>B. {card.option_b}</Text>
                  <Text style={[styles.optionText, { color: colors.textSecondary }]}>C. {card.option_c}</Text>
                  <Text style={[styles.optionText, { color: colors.textSecondary }]}>D. {card.option_d}</Text>
                </View>

                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>Answer:</Text>
                  <Text style={[styles.answerValue, { color: colors.accent }]}>Option {card.correct_option}</Text>
                </View>
              </View>
            );
          }}
          onSwipedRight={handleSwipedRight}
          onSwipedLeft={handleSwipedLeft}
          onSwipedAll={() => setFinished(true)}
          cardIndex={0}
          backgroundColor={colors.background}
          stackSize={3}
          showSecondCard
          animateOverlayLabelsOpacity
          animateCardOpacity
          swipeBackCard
          overlayLabels={{
            left: {
              title: 'NOPE',
              style: { label: { backgroundColor: '#f44336', color: 'white', fontSize: 24, padding: 10, borderRadius: 10 }, wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30 } }
            },
            right: {
              title: 'KNEW IT',
              style: { label: { backgroundColor: '#4caf50', color: 'white', fontSize: 24, padding: 10, borderRadius: 10 }, wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 } }
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backBtn: { padding: 8, width: 60 },
  backBtnText: { color: '#fff', fontSize: 16 },
  
  swiperContainer: { flex: 1, marginTop: -40 },
  card: { flex: 0.75, borderRadius: 24, padding: 24, justifyContent: 'center', backgroundColor: 'white', elevation: 5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  cardQuestion: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  optionsList: { marginTop: 10 },
  optionText: { fontSize: 16, marginBottom: 12 },
  
  answerBox: { marginTop: 40, alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12 },
  answerLabel: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 4 },
  answerValue: { fontSize: 24, fontWeight: 'bold' },

  noCardsText: { fontSize: 18, textAlign: 'center', marginBottom: 20 },
  finishTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  finishScore: { fontSize: 18, marginBottom: 30 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
