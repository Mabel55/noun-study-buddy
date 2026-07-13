import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  SafeAreaView, ScrollView, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { cacheCourseDetail, getCachedCourseDetail } from '../../utils/offlineStorage';

export default function CourseDetails() {
  const { id } = useLocalSearchParams();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    loadCourseData();
  }, [id]);

  const loadCourseData = async () => {
    // 1. Optimistic load from cache
    const cached = await getCachedCourseDetail(id as string);
    if (cached) {
      setCourseData(cached);
      setIsOffline(true);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Fetch fresh data from API in background
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`https://noun-study-buddy.onrender.com/api/courses/${id}/?t=${Date.now()}`, { 
        signal: controller.signal as any,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Network response not ok');
      const data = await response.json();
      
      setCourseData(data);
      setIsOffline(false);
      setLoading(false);

      // Silently cache for offline use
      await cacheCourseDetail(id as string, data);
    } catch (error) {
      console.log(`API fetch failed behind the scenes for course ${id}`);
      if (!cached) {
        setLoading(false);
      }
    }
  };

  if (loading) return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></SafeAreaView>;

  if (!courseData) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📡</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Course not available</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Connect to the internet to load this course.
        </Text>
        <TouchableOpacity 
          style={[styles.retryBtn, { backgroundColor: colors.accent }]} 
          onPress={() => { setLoading(true); loadCourseData(); }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent, fontWeight: 'bold' }}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const courseCode = courseData?.code || '';
  const firstDigit = courseCode.match(/\d/); 
  const fallbackIsAdvanced = firstDigit && parseInt(firstDigit[0], 10) >= 3;
  const isAdvanced = courseData?.exam_type 
    ? courseData.exam_type === 'POP' 
    : fallbackIsAdvanced;

  const qCount = (courseData?.cbt_questions?.length || 0) + (courseData?.pop_questions?.length || 0) + (courseData?.fill_questions?.length || 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.courseCode}>{courseData?.code}</Text>
        <Text style={[styles.courseTitle, { color: colors.headerSubtext }]}>{courseData?.title}</Text>
        <View style={styles.statsBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>📝 {qCount} Questions</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{isAdvanced ? '📄 POP' : '💻 CBT'}</Text></View>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#3d2a1a' : '#fff3e0' }]}>
          <Text style={[styles.offlineBannerText, { color: isDark ? '#ffb74d' : '#e65100' }]}>
            📥 Offline Mode — showing cached data
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        <Text style={[styles.promptText, { color: colors.text }]}>What would you like to do?</Text>

        {/* 1. Summary */}
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push(`/summary/${id}` as any)}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}><Text style={{fontSize: 24}}>📖</Text></View>
          <View style={{flex: 1}}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Read Summary</Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>AI-generated study notes</Text>
          </View>
        </TouchableOpacity>

        {/* 2. QUESTIONS & ANSWERS (Study Mode) */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card }]} 
          onPress={() => router.push(`/mock/${id}?mode=study&format=${isAdvanced ? 'POP' : 'CBT'}` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: colors.iconBlueBg}]}>
            <Text style={{fontSize: 24}}>💡</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Questions and Answers</Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {isAdvanced ? 'Theory Questions (300L+)' : 'Multiple Choice & Fill-in (100L-200L)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. THE TIMED MOCK EXAM */}
        {!isAdvanced ? (
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card }]} 
            onPress={() => router.push(`/mock/${id}?mode=exam&format=CBT` as any)}
          >
            <View style={[styles.iconCircle, {backgroundColor: colors.iconOrangeBg}]}>
              <Text style={{fontSize: 24}}>⏱️</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Take Timed Mock Exam</Text>
              <Text style={{fontSize: 12, color: colors.textMuted}}>Standard CBT Format</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionCard, { backgroundColor: colors.disabledBg, elevation: 0 }]}>
             <View style={[styles.iconCircle, {backgroundColor: colors.disabledIcon}]}>
               <Text style={{fontSize: 24, opacity: 0.4}}>⏱️</Text>
             </View>
             <View style={{flex: 1}}>
               <Text style={[styles.actionTitle, {color: colors.textMuted}]}>Take Timed Mock Exam</Text>
               <Text style={{fontSize: 12, color: colors.error, marginTop: 2}}>Not available for 300+ level (POP)</Text>
             </View>
          </View>
        )}

        {/* 4. AI STUDY CHAT */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card }]} 
          onPress={() => router.push(`/chat/${id}` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#f3e5f5'}]}>
            <Text style={{fontSize: 24}}>💬</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Ask AI Tutor</Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>Chat with your textbook 24/7</Text>
          </View>
        </TouchableOpacity>

        {/* 5. COURSE COMMUNITY */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card, marginBottom: 30 }]} 
          onPress={() => router.push(`/discussion/${id}` as any)}
        >
          <View style={[styles.iconCircle, {backgroundColor: '#e8f5e9'}]}>
            <Text style={{fontSize: 24}}>👥</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Course Community</Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>Discuss with other students</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  header: { padding: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 50 },
  backButton: { marginBottom: 15 },
  backText: { color: 'white', fontWeight: 'bold' },
  courseCode: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  courseTitle: { fontSize: 16, marginBottom: 12 },
  statsBadges: { flexDirection: 'row', gap: 10, marginTop: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  offlineBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  content: { padding: 20 },
  promptText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  actionCard: { padding: 18, borderRadius: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTitle: { fontSize: 17, fontWeight: 'bold' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
});