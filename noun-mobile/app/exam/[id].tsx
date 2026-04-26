import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MockExamPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const cleanId = String(id).split('?')[0];
    
    // Using the master course endpoint that worked for summaries
    fetch(`https://noun-study-buddy.onrender.com/api/courses/${cleanId}/`)
      .then((res) => res.json())
      .then((data) => {
        setCourseData(data);
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a4d3a" />
      </View>
    );
  }

  // Count the questions from your specific serializer names
  const cbtCount = courseData?.cbt_questions?.length || 0;
  const fillCount = courseData?.fill_questions?.length || 0;
  const totalQuestions = cbtCount + fillCount;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>{courseData?.title || 'Course Exam'}</Text>
        <Text style={styles.code}>{courseData?.code}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Total Questions: {totalQuestions}</Text>
          <Text style={styles.infoText}>Duration: 45 Minutes</Text>
          <Text style={styles.infoText}>Format: Mixed (CBT & Fill-in)</Text>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => router.push(`/exam/${id}`)}
        >
          <Text style={styles.buttonText}>Start Mock Exam</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a4d3a',
    textAlign: 'center',
  },
  code: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoText: {
    fontSize: 16,
    marginVertical: 5,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#1a4d3a',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
  },
  backText: {
    color: '#666',
    fontSize: 16,
  },
});