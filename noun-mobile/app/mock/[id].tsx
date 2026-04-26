import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MockExamEngine() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const cleanId = String(id).split('?')[0];

    // 👉 No "-1" in this URL!
    fetch(`https://noun-study-buddy.onrender.com/api/courses/${cleanId}/`)
      .then(res => res.json())
      .then(data => {
        // Grab the questions from the exact name in your Serializer
        const list = data.cbt_questions || [];
        setQuestions(list);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a4d3a" />
    </View>
  );

  if (questions.length === 0) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>Exam Unavailable: Could not load questions.</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.button}>
        <Text style={{color:'#fff'}}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  if (submitted) return (
    <View style={styles.center}>
      <Text style={styles.title}>Final Score: {score} / {questions.length}</Text>
      <Text style={{ fontSize: 18, marginTop: 10, marginBottom: 30 }}>
        {Math.round((score / questions.length) * 100)}%
      </Text>
      <TouchableOpacity onPress={() => router.push('/')} style={styles.button}>
        <Text style={{color:'#fff'}}>Return to Home</Text>
      </TouchableOpacity>
    </View>
  );

  const currentQ = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={{color:'#fff', fontSize: 16, fontWeight: 'bold'}}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQ?.text || currentQ?.question_text}</Text>

          {['a', 'b', 'c', 'd'].map((letter) => {
            const optionText = currentQ[`option_${letter}`];
            if (!optionText) return null;

            return (
              <TouchableOpacity
                key={letter}
                style={styles.option}
                onPress={() => {
                  if (letter.toUpperCase() === (currentQ.correct_answer || "").toUpperCase()) {
                    setScore(s => s + 1);
                  }
                  if (currentIndex < questions.length - 1) {
                    setCurrentIndex(c => c + 1);
                  } else {
                    setSubmitted(true);
                  }
                }}
              >
                <Text style={{ fontSize: 16 }}>
                  {letter.toUpperCase()}. {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: '#1a4d3a', padding: 20, alignItems: 'center' },
  card: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 10, elevation: 2 },
  questionText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  option: { padding: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, borderRadius: 8, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#1a4d3a', padding: 15, borderRadius: 8, paddingHorizontal: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a4d3a' }
});