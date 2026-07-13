import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const BASE_URL = 'https://noun-study-buddy-1.onrender.com';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { isLoggedIn, token, user } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Token ${token}`;
      
      const res = await fetch(`${BASE_URL}/api/leaderboard/`, { headers });
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setMyRank(data.my_rank);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
          <Text style={styles.headerSub}>Compete with fellow students</Text>
        </View>
        <View style={styles.centerBody}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🔒</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Login Required</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Log in to join the leaderboard, earn XP, and compete with friends!
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
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        </View>
        <View style={styles.centerBody}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <Text style={styles.headerSub}>Global Rankings (By XP)</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Current User Rank Card */}
        {myRank && (
          <View style={[styles.myRankCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
            <View>
              <Text style={[styles.myRankText, { color: colors.accent }]}>Your Rank</Text>
              <Text style={[styles.myRankNum, { color: colors.accent }]}>#{myRank}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Keep studying to</Text>
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>climb the ranks!</Text>
            </View>
          </View>
        )}

        {/* Top 3 Podium (Optional extra polish) */}
        {leaderboard.length >= 3 && (
          <View style={styles.podiumContainer}>
            {/* Rank 2 */}
            <View style={[styles.podium, { height: 120, backgroundColor: '#e0e0e0' }]}>
              <Text style={{ fontSize: 30 }}>🥈</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[1].username}</Text>
              <Text style={styles.podiumXp}>{leaderboard[1].xp_points} XP</Text>
            </View>
            {/* Rank 1 */}
            <View style={[styles.podium, { height: 150, backgroundColor: '#ffd700', zIndex: 10, shadowColor: '#ffd700', shadowOpacity: 0.5, shadowRadius: 10 }]}>
              <Text style={{ fontSize: 40, marginBottom: -5 }}>👑</Text>
              <Text style={{ fontSize: 30 }}>🥇</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[0].username}</Text>
              <Text style={styles.podiumXp}>{leaderboard[0].xp_points} XP</Text>
            </View>
            {/* Rank 3 */}
            <View style={[styles.podium, { height: 100, backgroundColor: '#cd7f32' }]}>
              <Text style={{ fontSize: 30 }}>🥉</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[2].username}</Text>
              <Text style={styles.podiumXp}>{leaderboard[2].xp_points} XP</Text>
            </View>
          </View>
        )}

        {/* List of everyone else */}
        <View style={[styles.listContainer, { backgroundColor: colors.card }]}>
          {leaderboard.map((student: any, index: number) => {
            const isMe = student.username === user?.username || student.username === user?.first_name;
            return (
              <View key={index} style={[styles.row, { borderBottomColor: colors.border }, isMe && { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.rankText, { color: colors.textSecondary }]}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </Text>
                
                <View style={styles.userInfo}>
                  <Text style={[styles.username, { color: colors.text }]}>
                    {student.username} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={[styles.levelText, { color: colors.textMuted }]}>
                    Lvl {student.level} • {student.badges_count} Badges
                  </Text>
                </View>

                <View style={styles.xpBox}>
                  <Text style={[styles.xpText, { color: colors.accent }]}>{student.xp_points}</Text>
                  <Text style={[styles.xpLabel, { color: colors.accentMid }]}>XP</Text>
                </View>
              </View>
            );
          })}
        </View>
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
  card: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  cardDesc: { textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },

  scrollContent: { padding: 16, paddingBottom: 40 },
  
  myRankCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 24 },
  myRankText: { fontSize: 14, fontWeight: 'bold' },
  myRankNum: { fontSize: 32, fontWeight: 'bold' },

  podiumContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 30, marginTop: 10, gap: 8 },
  podium: { width: 100, borderRadius: 16, padding: 10, alignItems: 'center', justifyContent: 'flex-end', elevation: 4 },
  podiumName: { fontWeight: 'bold', fontSize: 13, marginTop: 5, color: '#333' },
  podiumXp: { fontSize: 11, fontWeight: 'bold', color: '#666' },

  listContainer: { borderRadius: 20, overflow: 'hidden', elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  rankText: { width: 40, fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: 'bold' },
  levelText: { fontSize: 12, marginTop: 2 },
  xpBox: { alignItems: 'flex-end' },
  xpText: { fontSize: 18, fontWeight: 'bold' },
  xpLabel: { fontSize: 10, fontWeight: 'bold' },
});

