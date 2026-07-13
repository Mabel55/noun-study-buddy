import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { formatTimeAgo } from '../../../utils/offlineStorage';

const THREADS_URL = 'https://noun-study-buddy-1.onrender.com/api/discussion-threads/';
const REPLIES_URL = 'https://noun-study-buddy-1.onrender.com/api/discussion-replies/';

export default function ThreadDetail() {
  const { threadId } = useLocalSearchParams();
  const [thread, setThread] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New reply state
  const [newReply, setNewReply] = useState('');
  const [posting, setPosting] = useState(false);

  const { colors, isDark } = useTheme();
  const { isLoggedIn, token } = useAuth();
  const router = useRouter();

  const fetchData = async () => {
    try {
      // Fetch thread details
      const threadRes = await fetch(`${THREADS_URL}${threadId}/`);
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        setThread(threadData);
      }

      // Fetch replies
      const repliesRes = await fetch(`${REPLIES_URL}?thread_id=${threadId}`);
      if (repliesRes.ok) {
        const repliesData = await repliesRes.json();
        setReplies(repliesData);
      }
    } catch (error) {
      console.log('Failed to fetch thread data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [threadId]);

  const handlePostReply = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'You must be logged in to reply.');
      router.push('/auth/login' as any);
      return;
    }

    if (!newReply.trim()) return;

    setPosting(true);
    try {
      const response = await fetch(REPLIES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          thread: threadId,
          content: newReply
        })
      });

      if (response.ok) {
        setNewReply('');
        fetchData(); // Refresh to show new reply
      } else {
        Alert.alert('Failed to post reply');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Please try again later.');
    } finally {
      setPosting(false);
    }
  };

  const renderReply = ({ item }: { item: any }) => (
    <View style={[styles.replyCard, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
      <View style={styles.replyHeader}>
        <Text style={[styles.replyAuthor, { color: colors.text }]}>👤 {item.username || 'Student'}</Text>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      <Text style={[styles.replyContent, { color: colors.textSecondary }]}>{item.content}</Text>
    </View>
  );

  const ListHeader = () => {
    if (!thread) return null;
    return (
      <View style={[styles.threadOriginalPost, { backgroundColor: colors.card }]}>
        <Text style={[styles.threadTitle, { color: colors.text }]}>{thread.title}</Text>
        <View style={styles.replyHeader}>
           <Text style={[styles.replyAuthor, { color: colors.accent }]}>👤 {thread.username || 'Student'}</Text>
           <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatTimeAgo(thread.created_at)}</Text>
        </View>
        <Text style={[styles.threadContent, { color: colors.text }]}>{thread.content}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.repliesCount, { color: colors.textMuted }]}>{replies.length} Replies</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={replies}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderReply}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

          {/* Reply Input Area */}
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textMuted}
              value={newReply}
              onChangeText={setNewReply}
              multiline
            />
            <TouchableOpacity 
              style={[
                styles.sendBtn, 
                { backgroundColor: newReply.trim() ? colors.accent : colors.disabledBg }
              ]}
              onPress={handlePostReply}
              disabled={posting || !newReply.trim()}
            >
              {posting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: newReply.trim() ? '#fff' : colors.textMuted, fontWeight: 'bold' }}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingTop: 50 },
  backButton: { marginBottom: 15 },
  backText: { color: 'white', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  listContainer: { paddingBottom: 20 },
  
  threadOriginalPost: { padding: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'transparent', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  threadTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, lineHeight: 28 },
  threadContent: { fontSize: 16, lineHeight: 24, marginTop: 12 },
  divider: { height: 1, marginVertical: 16 },
  repliesCount: { fontSize: 14, fontWeight: 'bold' },
  
  replyCard: { padding: 16, marginLeft: 20, marginRight: 20, marginBottom: 12, borderRadius: 12, borderLeftWidth: 3 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  replyAuthor: { fontSize: 14, fontWeight: 'bold' },
  metaText: { fontSize: 12 },
  replyContent: { fontSize: 15, lineHeight: 22 },

  inputContainer: { flexDirection: 'row', padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, alignItems: 'flex-end' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100, minHeight: 45 },
  sendBtn: { marginLeft: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, justifyContent: 'center', alignItems: 'center', height: 45 },
});
