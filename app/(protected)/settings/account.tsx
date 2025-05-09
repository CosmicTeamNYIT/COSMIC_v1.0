import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // For gradient background
import { router } from 'expo-router'; // For navigation
import AsyncStorage from '@react-native-async-storage/async-storage'; // For clearing session data
import { useAuth } from '@/app/auth/AuthContext';

export default function AccountScreen() {
    const { signOut } = useAuth();
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [rememberMeActive, setRememberMeActive] = useState(false);

    useEffect(() => {
        // Function to check the expiration date and calculate days remaining
        const checkExpiration = async () => {
            try {
                const expirationDate = await AsyncStorage.getItem('authExpiration');

                if (expirationDate) {
                    const expDate = new Date(expirationDate);
                    const now = new Date();

                    // Calculate days remaining
                    const diffTime = expDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    setDaysRemaining(diffDays > 0 ? diffDays : 0);
                    setRememberMeActive(true);
                } else {
                    setRememberMeActive(false);
                }
            } catch (error) {
                console.error("Error checking expiration:", error);
                setRememberMeActive(false);
            }
        };

        checkExpiration();
    }, []);

    const handleLogout = () => {
        signOut();
    };

    return (
        <LinearGradient colors={['#000428', '#004e92']} style={styles.gradient}>
            <View style={styles.container}>
                <Text style={styles.title}>Account</Text>
                <Text style={styles.info}>Manage your account settings here.</Text>

                {/* Remember Me Status */}
                {rememberMeActive ? (
                    <View style={styles.rememberMeContainer}>
                        <Text style={styles.rememberMeTitle}>Remember Me Status</Text>
                        <Text style={styles.rememberMeText}>
                            {daysRemaining === 1
                                ? "Your session expires tomorrow."
                                : `Your session expires in ${daysRemaining} days.`}
                        </Text>
                        <Text style={styles.rememberMeSubtext}>
                            After this period, you'll need to sign in again.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.rememberMeContainer}>
                        <Text style={styles.rememberMeTitle}>Remember Me Status</Text>
                        <Text style={styles.rememberMeText}>
                            Remember Me is not enabled.
                        </Text>
                        <Text style={styles.rememberMeSubtext}>
                            You'll need to sign in again if you log out or close the app.
                        </Text>
                    </View>
                )}

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    info: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 30,
    },
    rememberMeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 10,
        width: '100%',
        marginBottom: 20,
    },
    rememberMeTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    rememberMeText: {
        color: '#FFF',
        fontSize: 16,
        marginBottom: 5,
    },
    rememberMeSubtext: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontStyle: 'italic',
    },
    logoutButton: {
        marginTop: 20,
        backgroundColor: '#FF5252', // Red button
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    logoutText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});