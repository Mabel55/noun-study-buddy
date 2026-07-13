import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo } from '../../utils/offlineStorage';

const API_URL = 'https://noun-study-buddy-1.onrender.com/api/discussion-threads/';

export default function CourseDiscussion() {
  const { courseId } = useLocalSearchParams();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // New thread form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  const { colors, isDark } = useTheme();
  const { user, isLoggedIn, token } = useAuth();
  const router = useRouter();

  const fetchThreads = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(`${API_URL}?course_id=${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setThreads(data);
      }
    } catch (error) {
      console.log('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [courseId]);

  const handleCreateThread = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'You must be logged in to start a discussion.');
      router.push('/auth/login' as any);
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Please enter both a title and content.');
      return;
    }

    setPosting(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          course: courseId,
          title: newTitle,
          content: newContent
        })
      });

      if (response.ok) {
        setModalVisible(false);
        setNewTitle('');
        setNewContent('');
        fetchThreads(true);
      } else {
        const errData = await response.json();
        Alert.alert('Failed to post', JSON.stringify(errData));
      }
    } catch (error) {
      Alert.alert('Network Error', 'Please try again later.');
    } finally {
      setPosting(false);
    }
  };

  const renderThread = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => router.push(`/discussion/thread/${item.id}` as any)}
    >
      <Text style={[styles.threadTitle, { color: colors.text }]}>{item.title}</Text>
      <View style={styles.threadMeta}>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          👤 {item.username || 'Student'} • {formatTimeAgo(item.created_at)}
        </Text>
        <View style={[styles.replyBadge, { backgroundColor: colors.accentLight }]}>
          <Text style={[styles.replyText, { color: colors.accent }]}>
            💬 {item.replies_count || 0} Replies
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Community</Text>
        <Text style={[styles.headerSubtitle, { color: colors.headerSubtext }]}>Discuss and learn together</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : threads.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No discussions yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Be the first to start a conversation!
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderThread}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchThreads(true)}
          refreshing={refreshing}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Thread Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Start a Discussion</Text>
            
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Topic Title (e.g., Need help with TMA 1)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              value={newContent}
              onChangeText={setNewContent}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { borderColor: colors.border }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.postBtn, { backgroundColor: colors.accent }]} 
                onPress={handleCreateThread}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Post Topic</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingTop: 50 },
  backButton: { marginBottom: 15 },
  backText: { color: 'white', fontWeight: 'bold' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 },
  card: { padding: 18, borderRadius: 16, marginBottom: 12, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  threadTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, lineHeight: 22 },
  threadMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12 },
  replyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  replyText: { fontSize: 10, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: -4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 24, minHeight: '50%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, height: 120, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  postBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
