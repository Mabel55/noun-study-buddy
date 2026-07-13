import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cacheCourses, getCachedCourses, getLastSyncTime, formatTimeAgo, checkIsOnline } from '../../utils/offlineStorage';

const API_URL = 'https://noun-study-buddy-1.onrender.com/api/courses/'; 

export default function CourseDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { colors, isDark, toggleTheme } = useTheme();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    // 1. Instantly load from cache if available (Optimistic Loading)
    const cached = await getCachedCourses();
    let hasCache = false;
    if (cached && cached.length > 0) {
      setCourses(cached);
      setLoading(false);
      setIsOffline(true);
      hasCache = true;
      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } else {
      setLoading(true); // Only show spinner if we have no cache
    }

    // 2. Fetch fresh data from API in the background
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout to allow Render to wake up
      
      const response = await fetch(`${API_URL}?t=${Date.now()}`, { 
        signal: controller.signal as any,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // Update UI with fresh data
      setCourses(data);
      setIsOffline(false);
      setLoading(false);

      // Silently cache for next time
      await cacheCourses(data);
    } catch (error) {
      console.log('API fetch failed behind the scenes.');
      if (!hasCache) {
        setLoading(false); // Make sure spinner stops if everything fails
      }
    }
  };

  const renderCourseCard = ({ item }: any) => {
    const qCount = (item.cbt_questions?.length || 0) + (item.pop_questions?.length || 0) + (item.fill_questions?.length || 0);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]} 
        onPress={() => router.push(`/course/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.courseCode, { color: colors.text }]}>{item.code}</Text>
          <View style={[styles.examBadge, { backgroundColor: item.exam_type === 'POP' ? '#fff3e0' : colors.accentLight }]}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.exam_type === 'POP' ? '#e65100' : colors.accent }}>
              {item.exam_type}
            </Text>
          </View>
        </View>
        <Text style={[styles.courseTitle, { color: colors.textSecondary }]}>{item.title}</Text>
        <View style={[styles.statsRow]}>
          <Text style={[styles.statText, { color: colors.textMuted }]}>📝 {qCount} Questions</Text>
          <Text style={[styles.statText, { color: colors.textMuted }]}>📖 {item.summaries?.length || 0} Summary</Text>
        </View>
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.accent }]}>Tap to start studying →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.headerText }]}>📚 NOUN Study Buddy</Text>
            <Text style={[styles.headerSubtitle, { color: colors.headerSubtext }]}>
              {isLoggedIn ? `Welcome, ${user?.first_name || user?.username || 'Student'}!` : 'Select a course to begin'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
              <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            {!isLoggedIn && (
              <TouchableOpacity 
                onPress={() => router.push('/auth/login' as any)} 
                style={[styles.loginBtn, { borderColor: 'rgba(255,255,255,0.4)' }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#3d2a1a' : '#fff3e0' }]}>
          <Text style={[styles.offlineBannerText, { color: isDark ? '#ffb74d' : '#e65100' }]}>
            📥 Offline Mode — showing cached data
          </Text>
          {lastSync && (
            <Text style={[styles.offlineSyncText, { color: isDark ? '#ffcc80' : '#f57c00' }]}>
              Last synced: {formatTimeAgo(lastSync)}
            </Text>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📡</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No courses available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {isOffline ? 'Connect to the internet to load courses for the first time.' : 'No courses found on the server.'}
          </Text>
          {isOffline && (
            <TouchableOpacity 
              style={[styles.retryBtn, { backgroundColor: colors.accent }]} 
              onPress={() => { setLoading(true); loadCourses(); }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCourseCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  offlineBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  offlineSyncText: {
    fontSize: 11,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  examBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  courseTitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  statText: {
    fontSize: 12,
  },
  actionRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
});

