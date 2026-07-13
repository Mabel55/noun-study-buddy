import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { cacheNews, getCachedNews, formatTimeAgo } from '../../utils/offlineStorage';

const API_URL = 'https://noun-study-buddy-1.onrender.com/api/news/';

type NewsCategory = 'ALL' | 'TMA' | 'EXAM' | 'GENERAL' | 'EVENTS';

export default function NewsScreen() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('ALL');
  const { colors, isDark } = useTheme();

  const fetchNews = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setNews(data);
      setIsOffline(false);
      await cacheNews(data);
    } catch (error) {
      console.log('Failed to fetch news, using cache...', error);
      const cached = await getCachedNews();
      if (cached) {
        setNews(cached);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TMA': return '#2196F3';
      case 'EXAM': return '#E91E63';
      case 'EVENTS': return '#FF9800';
      default: return colors.accent;
    }
  };

  const filteredNews = activeCategory === 'ALL' 
    ? news 
    : news.filter(item => item.category === activeCategory);

  const renderNewsCard = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: item.is_important ? colors.error : 'transparent', borderWidth: item.is_important ? 1 : 0 }]}>
      {item.is_important && (
        <View style={[styles.importantBadge, { backgroundColor: colors.errorLight }]}>
          <Text style={[styles.importantText, { color: colors.error }]}>🚨 IMPORTANT</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryPill, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatTimeAgo(item.date_posted)}</Text>
      </View>
      <Text style={[styles.newsTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.newsContent, { color: colors.textSecondary }]}>{item.content}</Text>
    </View>
  );

  const categories: { label: string, value: NewsCategory }[] = [
    { label: 'All Updates', value: 'ALL' },
    { label: 'TMA', value: 'TMA' },
    { label: 'Exams', value: 'EXAM' },
    { label: 'General', value: 'GENERAL' },
    { label: 'Events', value: 'EVENTS' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>📰 NOUN News</Text>
        <Text style={[styles.headerSubtitle, { color: colors.headerSubtext }]}>Stay updated with the latest from NOUN</Text>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#3d2a1a' : '#fff3e0' }]}>
          <Text style={[styles.offlineBannerText, { color: isDark ? '#ffb74d' : '#e65100' }]}>
            📥 Offline Mode — showing cached news
          </Text>
        </View>
      )}

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                { 
                  backgroundColor: activeCategory === item.value ? colors.accent : (isDark ? '#333' : '#eee'),
                  borderColor: activeCategory === item.value ? colors.accent : colors.border
                }
              ]}
              onPress={() => setActiveCategory(item.value)}
            >
              <Text style={{ 
                color: activeCategory === item.value ? '#fff' : colors.text,
                fontWeight: activeCategory === item.value ? 'bold' : 'normal'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : filteredNews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No news found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Check back later for updates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderNewsCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNews(true)} tintColor={colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  offlineBanner: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  offlineBannerText: { fontSize: 13, fontWeight: 'bold' },
  filterContainer: { marginTop: 16, marginBottom: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  dateText: { fontSize: 12 },
  newsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, lineHeight: 24 },
  newsContent: { fontSize: 14, lineHeight: 22 },
  importantBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  importantText: { fontSize: 10, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

