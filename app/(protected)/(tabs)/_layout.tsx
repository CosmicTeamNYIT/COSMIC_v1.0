// _layout.tsx defines a tab layout for an Expo application using expo-router.
// It sets up three tabs: Social, Home, and Profile, each with a custom icon and label.
// It also configures the tab bar appearance, including hiding the header, using a custom button component, and setting fixed colors for active and inactive states regardless of the system color scheme.

import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const defaultActiveTintColor = '#2f80ed';
    const inactiveTintColor = 'gray';
    const profileActiveColor = '#b62b2b';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarButton: HapticTab,
                animation: "shift",
                tabBarStyle: {
                    backgroundColor: 'white',
                },
            }}>
            <Tabs.Screen
                name="social"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabContainer}>
                            <Ionicons name="people" size={20} color={focused ? '#603d9f' : inactiveTintColor} />
                            <Text style={[styles.tabLabel, { color: focused ? '#603d9f' : inactiveTintColor }]}>Social</Text>
                        </View>
                    ),
                    title: ' ',
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabContainer}>
                            <Ionicons name="home" size={20} color={focused ? defaultActiveTintColor : inactiveTintColor} />
                            <Text style={[styles.tabLabel, { color: focused ? defaultActiveTintColor : inactiveTintColor }]}>Home</Text>
                        </View>
                    ),
                    title: ' ',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabContainer}>
                            <Ionicons name="person" size={20} color={focused ? profileActiveColor : inactiveTintColor} />
                            <Text style={[styles.tabLabel, { color: focused ? profileActiveColor : inactiveTintColor }]}>Profile</Text>
                        </View>
                    ),
                    title: ' ',
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabContainer: {
        flex: 1,
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 12,
        textAlign: 'center',
        width: '100%',
    },
});