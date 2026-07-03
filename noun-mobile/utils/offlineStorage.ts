/**
 * offlineStorage.ts — NOUN Study Buddy Offline Mode
 * ==================================================
 * Caches courses and course details to AsyncStorage so students
 * can study without internet. Auto-syncs when back online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Storage keys
const KEYS = {
  COURSES: '@noun_cached_courses',
  COURSE_DETAIL: (id: string | number) => `@noun_cached_course_${id}`,
  LAST_SYNC: '@noun_last_sync',
};

// ── Network Check ────────────────────────────────────────────────────────────

/**
 * Returns true if the device has an active internet connection.
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
}

// ── Course List Cache ────────────────────────────────────────────────────────

/**
 * Saves the full course list to local storage.
 * Called silently after a successful API fetch.
 */
export async function cacheCourses(courses: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to cache courses:', error);
  }
}

/**
 * Retrieves the cached course list.
 * Returns null if nothing is cached.
 */
export async function getCachedCourses(): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.COURSES);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to read cached courses:', error);
    return null;
  }
}

// ── Individual Course Detail Cache ───────────────────────────────────────────

/**
 * Saves a single course's full data (including questions, summaries).
 * Called silently after a successful course detail API fetch.
 */
export async function cacheCourseDetail(id: string | number, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.COURSE_DETAIL(id), JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to cache course ${id}:`, error);
  }
}

/**
 * Retrieves a cached course detail.
 * Returns null if nothing is cached for this course.
 */
export async function getCachedCourseDetail(id: string | number): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.COURSE_DETAIL(id));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn(`Failed to read cached course ${id}:`, error);
    return null;
  }
}

// ── Last Sync Time ───────────────────────────────────────────────────────────

/**
 * Returns the last time data was synced from the API.
 * Useful for showing "Last updated: 2 hours ago" in offline mode.
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

/**
 * Returns a human-readable "time ago" string.
 */
export function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
