// Show friend profile information once clicked on
// User needs to be friends with second user for profile info to populate
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Image, View, ScrollView, Text, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { db } from '@/src/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function FriendsInfoScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();

    const [username, setUsername] = useState('@Loading');
    const [location, setLocation] = useState('Loading...');
    const [bio, setBio] = useState('Loading user information...');
    const [phone, setPhone] = useState('Loading...');
    const [email, setEmail] = useState('Loading...');
    const [tag, setTag] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    const loadFriendProfile = useCallback(async (friendUserId: string) => {
        if (!friendUserId) {
            setError("Friend ID not provided.");
            setLoading(false);
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", friendUserId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUsername(userData.username || '@Username');
                setLocation(userData.location || 'N/A');
                setBio(userData.bio || 'No bio available.');
                setPhone(userData.phone || 'N/A');
                setEmail(userData.email || 'N/A');
                setTag(userData.socialHandle || 'N/A');
                setLoading(false);
            } else {
                setError("Friend profile not found.");
                setLoading(false);
            }
        } catch (error: any) {
            console.error('Error loading friend profile:', error);
            setError(`Failed to load profile data: ${error.message || error}`);
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        if (userId) {
            loadFriendProfile(userId);
        } else {
            setError("No user ID provided for friend profile.");
            setLoading(false);
        }
    }, [userId, loadFriendProfile]);

    if (loading) {
        return (
            <LinearGradient
                colors={['#151010', '#8c1212']}
                style={[styles.gradient, styles.centered]}
            >
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </LinearGradient>
        );
    }

    if (error) {
        return (
            <LinearGradient
                colors={['#151010', '#8c1212']}
                style={[styles.gradient, styles.centered]}
            >
                <Text style={styles.errorText}>{`Error: ${error}`}</Text>
            </LinearGradient>
        );
    }


    return (
        <LinearGradient
            colors={['#151010', '#8c1212']}
            style={styles.gradient}>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.userInfoPrimary}>
                    <Image
                        source={require('@/assets/images/avatar_icon.jpg')}
                        style={styles.profilePic}
                    />
                    <ThemedText style={styles.primaryUserName}>{username}</ThemedText>
                </View>


                <View style={styles.detailsContainer}>
                    <ThemedText style={styles.sectionTitle}>Details</ThemedText>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="location-on" size={24} color="#FFF" />
                        <View style={styles.detailTextContainer}>
                            <ThemedText style={styles.detailLabel}>Location:</ThemedText>
                            <ThemedText style={styles.detailValue}>{location}</ThemedText>
                        </View>
                    </View>

                    <View style={styles.detailItem}>
                        <MaterialIcons name="description" size={24} color="#FFF" />
                        <View style={styles.detailTextContainer}>
                            <ThemedText style={styles.detailLabel}>Bio:</ThemedText>
                            <ThemedText style={styles.detailValue}>{bio}</ThemedText>
                        </View>
                    </View>

                    <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>Contact Information</ThemedText>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="phone" size={24} color="#FFF" />
                        <View style={styles.detailTextContainer}>
                            <ThemedText style={styles.detailLabel}>Phone:</ThemedText>
                            <ThemedText style={styles.detailValue}>{phone}</ThemedText>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="email" size={24} color="#FFF" />
                        <View style={styles.detailTextContainer}>
                            <ThemedText style={styles.detailLabel}>Email:</ThemedText>
                            <ThemedText style={styles.detailValue}>{email}</ThemedText>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="public" size={24} color="#FFF" />
                        <View style={styles.detailTextContainer}>
                            <ThemedText style={styles.detailLabel}>Social Handle:</ThemedText>
                            <ThemedText style={styles.detailValue}>{tag}</ThemedText>
                        </View>
                    </View>
                </View>


            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#FFF',
        fontSize: 16,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    gradient: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 60,
        paddingBottom: 24,
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 20,
    },
    userInfoPrimary: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profilePic: {
        height: 100,
        width: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: 'white',
        marginBottom: 10,
    },
    primaryUserName: {
        fontSize: 22,
        color: 'white',
        fontWeight: 'bold',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 15,
        paddingRight: 15,
        borderRadius: 20,
    },
    detailsContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        flexDirection: 'row',
        fontSize: 20,
        color: '#FFF',
        fontWeight: 'regular',
        padding: 5,
        width: '100%',
        marginBottom: 10,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        width: '100%',
    },
    detailTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: '#CCC',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: '#FFF',
        flexShrink: 1,
    },
});