import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    // This simply tells the app to load whichever page the URL asks for!
    <Stack screenOptions={{ headerShown: false }} />
  );
}