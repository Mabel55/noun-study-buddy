import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password1 || !password2) {
      setError('Please fill in all fields');
      return;
    }
    if (password1 !== password2) {
      setError('Passwords do not match');
      return;
    }
    if (password1.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    const result = await register({ username: username.trim(), email: email.trim(), password1, password2 });
    setLoading(false);
    if (result.success) {
      router.replace('/' as any);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🎓</Text>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join NOUN Study Buddy for free
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                <Text style={{ color: colors.error, fontWeight: 'bold' }}>⚠️ {error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. john_doe"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="your.email@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              value={password1}
              onChangeText={setPassword1}
              secureTextEntry
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textMuted}
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: colors.accent }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login' as any)}>
                <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  headerSection: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 6 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 16 },
  registerBtn: { marginTop: 28, padding: 18, borderRadius: 14, alignItems: 'center' },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 8 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
