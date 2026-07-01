import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { isLoggedIn, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setLoading(false);
      return;
    }
    fetch(`${BASE_URL}/api/dashboard/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isLoggedIn, token]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.headerTitle}>📊 Dashboard</Text>
          <Text style={styles.headerSub}>Track your study progress</Text>
        </View>
        <View style={styles.centerBody}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🔒</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Login Required</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Create an account to track your scores, view progress charts, and see your readiness level.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/auth/login' as any)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.headerTitle}>📊 Dashboard</Text>
        </View>
        <View style={styles.centerBody}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  const streak = data?.streak || { current: 0, longest: 0 };
  const badges = data?.badges || [];
  const courseProgress = data?.course_progress || [];
  const recentExams = data?.recent_exams || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSub}>Welcome, {data?.username || 'Student'}!</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>  
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>{data?.xp_points || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>XP Points</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>Lvl {data?.level || 1}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Level</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>{streak.current}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day Streak</Text>
          </View>
        </View>

        {/* Overall Performance */}
        <View style={[styles.perfCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 Overall Performance</Text>
          <View style={styles.perfRow}>
            <View style={styles.perfItem}>
              <Text style={[styles.perfValue, { color: colors.text }]}>{data?.total_exams || 0}</Text>
              <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Exams Taken</Text>
            </View>
            <View style={[styles.perfDivider, { backgroundColor: colors.border }]} />
            <View style={styles.perfItem}>
              <Text style={[styles.perfValue, { color: colors.text }]}>{data?.avg_score || 0}%</Text>
              <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Avg Score</Text>
            </View>
            <View style={[styles.perfDivider, { backgroundColor: colors.border }]} />
            <View style={styles.perfItem}>
              <Text style={[styles.perfValue, { color: colors.text }]}>{streak.longest}</Text>
              <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* Course Readiness */}
        {courseProgress.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>🎯 Course Readiness</Text>
            {courseProgress.map((cp: any) => (
              <View key={cp.course_id} style={[styles.courseCard, { backgroundColor: colors.card }]}>
                <View style={styles.courseHeader}>
                  <Text style={[styles.courseCode, { color: colors.text }]}>{cp.code}</Text>
                  <Text style={[styles.readiness, { color: cp.readiness >= 70 ? colors.accent : cp.readiness >= 50 ? '#ff9800' : colors.error }]}>
                    {cp.readiness}% Ready
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBarFill, { 
                    width: `${Math.min(100, cp.readiness)}%`, 
                    backgroundColor: cp.readiness >= 70 ? colors.accent : cp.readiness >= 50 ? '#ff9800' : colors.error 
                  }]} />
                </View>
                <Text style={[styles.courseStats, { color: colors.textMuted }]}>
                  {cp.attempts} exams · Best: {cp.best_score}% · Avg: {cp.avg_score}%
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>🎖️ Badges Earned</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {badges.map((b: any, i: number) => (
                <View key={i} style={[styles.badgeCard, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 30 }}>{b.icon}</Text>
                  <Text style={[styles.badgeName, { color: colors.text }]}>{b.name}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent Exams */}
        {recentExams.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>📋 Recent Exams</Text>
            {recentExams.map((ex: any, i: number) => (
              <View key={i} style={[styles.examRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.examCode, { color: colors.text }]}>{ex.course_code}</Text>
                  <Text style={[styles.examDate, { color: colors.textMuted }]}>{ex.date}</Text>
                </View>
                <View style={styles.examScoreBox}>
                  <Text style={[styles.examScore, { 
                    color: ex.percentage >= 70 ? colors.accent : ex.percentage >= 50 ? '#ff9800' : colors.error 
                  }]}>
                    {ex.percentage}%
                  </Text>
                  <Text style={[styles.examFraction, { color: colors.textMuted }]}>{ex.score}/{ex.total}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Weak Areas */}
        {data?.weak_areas && data.weak_areas.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>🎯 Focus Areas (Weaknesses)</Text>
            {data.weak_areas.map((wa: any, i: number) => (
              <View key={i} style={[styles.weakRow, { backgroundColor: colors.card, borderColor: colors.error }]}>
                <View style={styles.weakBadge}>
                  <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>Failed {wa.fail_count}x</Text>
                </View>
                <Text style={[styles.weakCourse, { color: colors.textSecondary }]}>{wa.course_code}</Text>
                <Text style={[styles.weakText, { color: colors.text }]} numberOfLines={2}>{wa.question_text}</Text>
              </View>
            ))}
          </>
        )}

        {/* Empty state */}
        {(data?.total_exams || 0) === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 12 }}>📝</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No exams yet!</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Take your first mock exam to start tracking your progress here.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/' as any)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Browse Courses</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  centerBody: { flex: 1, justifyContent: 'center', padding: 20 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2 },

  perfCard: { borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 },
  perfRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  perfItem: { alignItems: 'center' },
  perfValue: { fontSize: 24, fontWeight: 'bold' },
  perfLabel: { fontSize: 12, marginTop: 4 },
  perfDivider: { width: 1, height: 40 },

  sectionTitle: { fontSize: 17, fontWeight: 'bold' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },

  courseCard: { borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  courseCode: { fontSize: 16, fontWeight: 'bold' },
  readiness: { fontSize: 14, fontWeight: 'bold' },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  courseStats: { fontSize: 12, marginTop: 8 },

  badgeCard: { width: 90, borderRadius: 14, padding: 14, marginRight: 10, alignItems: 'center', elevation: 2 },
  badgeName: { fontSize: 11, fontWeight: 'bold', marginTop: 6, textAlign: 'center' },

  examRow: { borderRadius: 14, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  examCode: { fontSize: 16, fontWeight: 'bold' },
  examDate: { fontSize: 12, marginTop: 2 },
  examScoreBox: { alignItems: 'flex-end' },
  examScore: { fontSize: 22, fontWeight: 'bold' },
  examFraction: { fontSize: 12 },

  card: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3, marginTop: 20 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  cardDesc: { textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
  
  weakRow: { borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderLeftWidth: 4 },
  weakBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#f44336', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  weakCourse: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  weakText: { fontSize: 14, lineHeight: 20, paddingRight: 60 },
});
