import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>👤 Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info */}
        {isLoggedIn ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
              <Text style={{ fontSize: 40 }}>🎓</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>
              {user?.first_name || user?.username || 'Student'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary, marginBottom: 12 }]}>{user?.email}</Text>
            
            <View style={[styles.premiumBadge, { backgroundColor: '#ffd700' }]}>
              <Text style={{ fontWeight: 'bold', color: '#000' }}>👑 Free Plan</Text>
            </View>
            <TouchableOpacity style={{ marginTop: 10 }}>
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Upgrade to Premium →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
              <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>Guest User</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>Log in to track your progress</Text>
            <TouchableOpacity 
              style={[styles.loginBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/auth/login' as any)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SETTINGS</Text>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={toggleTheme}>
          <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{isDark ? 'Currently ON' : 'Currently OFF'}</Text>
          </View>
          <View style={[styles.toggle, { backgroundColor: isDark ? colors.accent : colors.border }]}>
            <View style={[styles.toggleDot, { alignSelf: isDark ? 'flex-end' : 'flex-start' }]} />
          </View>
        </TouchableOpacity>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>

        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 20 }}>📱</Text>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>App Version</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>NOUN Study Buddy v2.0</Text>
          </View>
        </View>

        {/* Logout */}
        {isLoggedIn && (
          <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.error }]} onPress={handleLogout}>
            <Text style={{ color: colors.error, fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  card: { borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 24, elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  name: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  loginBtn: { marginTop: 16, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginTop: 10, letterSpacing: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600' },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  logoutBtn: { marginTop: 30, padding: 16, borderRadius: 14, borderWidth: 2, alignItems: 'center' },
  premiumBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
});
