import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function SettingsScreen() {
    return (
        <LinearGradient
            colors={['#000428', '#004e92']}
            style={styles.gradient}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Settings</Text>
                

                {/* Account Option - Navigate to Account Screen */}
                <TouchableOpacity
                    style={styles.option}
                    onPress={() => router.push('/(protected)/settings/account')}
                >
                    <Text style={styles.optionText}>Account</Text>
                </TouchableOpacity>

                {/*
                <TouchableOpacity style={styles.option} onPress={() => {}}>
                    <Text style={styles.optionText}>About</Text>
                </TouchableOpacity>
                */}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 30,
        textAlign: 'center',
    },
    option: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)', s
        borderRadius: 10,
        paddingVertical: 15,
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 18,
        color: '#FFF',
        textAlign: 'center',
    },
});