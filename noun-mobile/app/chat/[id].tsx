import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Markdown from 'react-native-markdown-display';

const BASE_URL = 'https://noun-study-buddy-1.onrender.com';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { isLoggedIn, token } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI Study Tutor for this course. Ask me anything about the topics we cover!' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || !isLoggedIn) return;
    
    const userMsg: Message = { role: 'user', content: inputText.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          course_id: id,
          messages: newMessages
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerBody}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>🔒</Text>
          <Text style={[styles.title, { color: colors.text }]}>Login Required</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Log in to chat directly with your AI tutor!
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/auth/login' as any)}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💬 AI Tutor</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContainer}
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View 
                key={index} 
                style={[
                  styles.messageBubble, 
                  isUser ? [styles.userBubble, { backgroundColor: colors.accent }] : [styles.aiBubble, { backgroundColor: colors.card }]
                ]}
              >
                {isUser ? (
                  <Text style={[styles.messageText, { color: '#fff' }]}>{msg.content}</Text>
                ) : (
                  <Markdown style={{ body: { color: colors.text, fontSize: 16 } }}>
                    {msg.content}
                  </Markdown>
                )}
              </View>
            );
          })}
          {loading && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, alignSelf: 'flex-start', width: 60 }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="Ask a question..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.accent : colors.border }]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  keyboardView: { flex: 1 },
  chatContainer: { padding: 15, paddingBottom: 20 },
  messageBubble: { padding: 14, borderRadius: 20, marginBottom: 12, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5, elevation: 1 },
  messageText: { fontSize: 16, lineHeight: 22 },
  
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, maxHeight: 100 },
  sendBtn: { marginLeft: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, justifyContent: 'center' },

  centerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  desc: { textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
});
