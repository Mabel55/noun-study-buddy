import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

export default function BuddyChatScreen() {
  const { matchId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!token || !matchId) return;
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [matchId, token]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/messages/?match_id=${matchId}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await res.json();
      setMessages(data.results || data);
    } catch (e) {
      console.log('Failed to fetch messages');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !token) return;

    const tempMsg = {
      id: Math.random().toString(),
      content: inputText,
      sender_username: user?.username,
      sent_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');

    try {
      const res = await fetch(`${BASE_URL}/api/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ match: matchId, content: tempMsg.content })
      });
      if (res.ok) fetchMessages();
    } catch (e) {
      console.log('Failed to send message');
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_username === user?.username;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
        <View style={[styles.msgBubble, { backgroundColor: isMe ? colors.accent : colors.card }]}>
          <Text style={{ color: isMe ? '#fff' : colors.text }}>{item.content}</Text>
        </View>
        <Text style={[styles.msgTime, { color: colors.textMuted }]}>
          {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{width: 60}} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.accent : colors.border }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backBtn: { padding: 8, width: 60 },
  backText: { color: '#fff', fontSize: 16 },

  msgWrapper: { marginBottom: 15, maxWidth: '80%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgBubble: { padding: 12, borderRadius: 16 },
  msgTime: { fontSize: 10, marginTop: 4, marginHorizontal: 4 },

  inputRow: { flexDirection: 'row', padding: 10, alignItems: 'flex-end', borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, marginRight: 10 },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
