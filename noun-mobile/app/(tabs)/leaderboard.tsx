import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <Text style={styles.headerSub}>Compete with fellow students</Text>
      </View>

      <View style={styles.body}>
        {!isLoggedIn ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🔒</Text>
            <Text style={[styles.title, { color: colors.text }]}>Login Required</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Log in to see the weekly rankings, earn XP points, and collect badges for your achievements!
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/auth/login' as any)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🚧</Text>
            <Text style={[styles.title, { color: colors.text }]}>Coming Soon</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              The leaderboard with XP rankings, badges, and weekly competitions is being built!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { borderRadius: 20, padding: 40, alignItems: 'center', elevation: 3 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  desc: { textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
});
