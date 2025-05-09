// app/(protected)/_layout.tsx
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/app/auth/AuthContext';
import { View, ActivityIndicator, BackHandler } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ProtectedLayout() {
    const { user, loading, initialAuthCheckComplete } = useAuth();
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Only redirect after initial auth check is complete
        if (initialAuthCheckComplete && !loading && !user) {
            console.log("No authenticated user found, redirecting to login");
            router.replace('/login');
        }
    }, [user, loading, initialAuthCheckComplete]);

    useEffect(() => {
        const backAction = () => {

            return true; // Returning true prevents the default back button behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, []); // Empty dependency array means this runs only once after the initial render

    // While loading or waiting for initial auth check, show loading indicator
    if (loading || !initialAuthCheckComplete) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2f80ed" />
            </View>
        );
    }

    // If no user after auth check is complete, don't render anything
    if (!user) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerTitleAlign: 'center',
                headerBackTitleVisible: false,
                headerTintColor: '#000',
                headerStyle: {
                    backgroundColor: 'white',
                },
            }}
        >
            {/* Tab navigation */}
            <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
            />

            {/* Individual screens */}
            <Stack.Screen name="settings" options={{
                headerShown: true,
                title: 'Settings' }}
            />
            <Stack.Screen name="events/manageEvents" options={{
                headerShown: true,
                title: 'Manage Events' }}
            />
            <Stack.Screen name="maps" options={{
                headerShown: true,
                title: 'Maps' }}
            />
            <Stack.Screen name="settings/account" options={{
                headerShown: true,
                title: 'Manage Account' }}
            />
            <Stack.Screen name="friends" options={{
                headerShown: true,
                title: 'Manage Friends' }}
            />
            <Stack.Screen name="friendsInfo" options={{
                headerShown: true,
                title: 'Friend Info' }}
            />
        </Stack>
    );
}