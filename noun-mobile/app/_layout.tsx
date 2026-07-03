import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, Head } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <title>NOUN Study Buddy | The Ultimate Offline Companion</title>
        <meta name="description" content="Study smarter with NOUN Study Buddy. Get past questions, course summaries, and AI tutor help specifically tailored for National Open University of Nigeria (NOUN) students." />
        <meta property="og:title" content="NOUN Study Buddy" />
        <meta property="og:description" content="The ultimate offline study companion for NOUN students." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="NOUN, National Open University of Nigeria, Past Questions, CBT, TMA, MTH101, Study Buddy" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <AuthProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}