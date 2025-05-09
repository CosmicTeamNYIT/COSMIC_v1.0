import React, { useState, useEffect, useCallback } from 'react';
import {StyleSheet, Image, View, TouchableOpacity, TextInput, Modal, Button, ScrollView, Text, Alert} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import { auth, db } from '@/src/firebaseConfig';
import {collection, doc, getDoc, getDocs, query, updateDoc, where} from 'firebase/firestore';

// ProfileScreen functional component: Displays and allows editing of the user's profile information.
export default function ProfileScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [username, setUsername] = useState('@Username');
    const [location, setLocation] = useState('Location');
    const [bio, setBio] = useState('This is a short bio about the user.');
    const [phone, setPhone] = useState('+1(234) - 567 - 8901');
    const [email, setEmail] = useState('user@example.com');
    const [tag, setTag] = useState('@Username');

    // State for editing modal inputs
    const [editUsername, setEditUsername] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editTag, setEditTag] = useState('');

    // Method to check if a username already exists in Firestore
    const checkUsernameExists = async (username: string, currentUserId?: string) => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);
            // If checking during update, exclude current user's document
            if (currentUserId) {
                return querySnapshot.docs.some(doc => doc.id !== currentUserId);
            }

            return !querySnapshot.empty;
        } catch (error) {
            console.error("Error checking username:", error);
            throw error;
        }
    };

    // Method to load the current user's profile data from Firestore
    const loadUserProfile = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUsername(userData.username || '@Username');
                    setLocation(userData.location || 'N/A');
                    setBio(userData.bio || 'This is a short bio about the user.');
                    setPhone(userData.phone || 'N/A');
                    setEmail(userData.email || 'user@example.com');
                    setTag(userData.socialHandle || 'N/A');

                    // Set edit states with current data
                    setEditUsername(userData.username || '');
                    setEditLocation(userData.location || '');
                    setEditBio(userData.bio || '');
                    setEditPhone(userData.phone || '');
                    setEditTag(userData.socialHandle || '');
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
                Alert.alert('Error', 'Failed to load profile data');
            }
        } else {
            // If no user is logged in, navigate back to the login screen or handle accordingly
            router.replace('/login');
        }
    }, [setUsername, setLocation, setBio, setPhone, setEmail, setTag, setEditUsername, setEditLocation, setEditBio, setEditPhone, setEditTag, router]);

    // Effect hook to load user profile when the component mounts or loadUserProfile changes
    useEffect(() => {
        loadUserProfile();
    }, [loadUserProfile]);

    // Method to handle updating the user's profile data in Firestore
    const handleUpdateProfile = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert('Error', 'No user logged in');
            return;
        }

        try {
            // Only check for username existence if it has changed
            if (editUsername !== username) {
                const usernameExists = await checkUsernameExists(editUsername, currentUser.uid);
                if (usernameExists) {
                    Alert.alert('Error', 'Username already taken. Please choose another.');
                    return;
                }
            }

            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                username: editUsername,
                location: editLocation,
                bio: editBio,
                phone: editPhone,
                socialHandle: editTag,
                updatedAt: new Date()
            });
            // Update local state with new values
            setUsername(editUsername);
            setLocation(editLocation);
            setBio(editBio);
            setPhone(editPhone);
            setTag(editTag);

            setModalVisible(false);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    // Method to clear local state and reload profile data from Firestore
    const handleReloadData = () => {
        // Clear current user data from state
        setUsername('');
        setLocation('');
        setBio('');
        setPhone('');
        setEmail('');
        setTag('');

        setEditUsername('');
        setEditLocation('');
        setEditBio('');
        setEditPhone('');
        setEditTag('');
        // Trigger the data loading again
        loadUserProfile();
    };

    return (

        <LinearGradient
            colors={['#151010', '#8c1212']}
            style={styles.gradient}>


            <View style={styles.headerContainer}>
                <Text style={styles.title}>Profile</Text>
                <TouchableOpacity style={styles.settingsButton}
                   onPress={() => setModalVisible(true)}>
                    <MaterialIcons name="edit" size={24} color="#333333" />

                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                {/* User Info Section */}
                <View style={styles.userInfoContainer}>
                    <Image
                        source={require('@/assets/images/avatar_icon.jpg')}
                        style={styles.profilePic}
                    />
                    <ThemedText style={styles.userName}>{username}</ThemedText>
                    <ThemedText style={styles.userLocation}>{location}</ThemedText>
                    <ThemedText style={styles.userBio}>{bio}</ThemedText>
                </View>

                {/* Contact Information Section */}
                <View style={styles.contactContainer}>
                    <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
                    <View style={styles.contactItem}>
                        <MaterialIcons name="phone" size={24} color="#FFF" />
                        <ThemedText style={styles.contactText}>{phone}</ThemedText>
                    </View>
                    <View style={styles.contactItem}>
                        <MaterialIcons name="email" size={24} color="#FFF" />
                        <ThemedText style={styles.contactText}>{email}</ThemedText>
                    </View>
                    <View style={styles.contactItem}>
                        <MaterialIcons name="public" size={24} color="#FFF" />
                        <ThemedText style={styles.contactText}>{tag}</ThemedText>
                    </View>
                </View>

                {/* Action Buttons Section */}
                <View style={styles.actionContainer}>
                    <ThemedText style={styles.sectionTitle}>Actions</ThemedText>
                    <View style={styles.gridContainer}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                router.push('/events/manageEvents');
                            }}
                        >
                            <MaterialIcons name="event" size={24} color="#FFF" />
                            <ThemedText style={styles.actionText}>Manage Events</ThemedText>
                        </TouchableOpacity>




                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={handleReloadData}
                        >
                            <MaterialIcons name="refresh" size={24} color="#FFF" />
                            <ThemedText style={styles.actionText}>Reload Data</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => router.push('/maps')}
                        >
                            <MaterialIcons name="gps-fixed" size={24} color="#FFF" />
                            <ThemedText style={styles.actionText}>GPS</ThemedText>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => router.push('/settings')}
                        >
                            <MaterialIcons name="settings" size={24} color="#FFF" />
                            <ThemedText style={styles.actionText}>Settings</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Edit Profile Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <ScrollView>
                                <Text style={styles.label}>Username</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editUsername}
                                    onChangeText={setEditUsername}
                                    placeholder="Enter username"
                                />

                                <Text style={styles.label}>Location</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editLocation}
                                    onChangeText={setEditLocation}
                                    placeholder="Enter location"
                                />

                                <Text style={styles.label}>Bio</Text>
                                <TextInput
                                    style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                    value={editBio}
                                    onChangeText={setEditBio}
                                    placeholder="Enter bio"
                                    multiline
                                    numberOfLines={4}
                                />


                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    placeholder="Enter phone number"
                                />

                                <Text style={styles.label}>Social Handle</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editTag}
                                    onChangeText={setEditTag}
                                    placeholder="Enter social handle"
                                />

                                <View style={styles.modalButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleUpdateProfile}
                                    >
                                        <Text style={styles.modalButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>



            </View>
        </LinearGradient>
    );
}
const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 24,
    },
    label: {
        fontSize: 16,
        color: '#000',
        marginBottom: 5,
        marginTop: 10,
        fontWeight: '600',
    },
    title: {
        fontSize: 18,
        fontWeight: 'regular',
        color: '#333333',
        textAlign: 'left',
        marginLeft: 10,
    },
    headerContainer: {
        marginVertical: 25,
        padding: 5,
        backgroundColor: 'white',
        borderRadius: 30,
        width: '100%',
        alignSelf: "center",
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingsButton: {
        padding: 5,
        marginRight: 10,
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
    },
    userInfoContainer: {
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
    userName: {
        fontSize: 22,
        color: 'white',
        fontWeight: 'regular',
        fontStyle: 'normal',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 15,
        paddingRight: 15,
        borderRadius: 20,
    },
    userLocation: {
        fontSize: 14,
        color: '#FFF',
        marginVertical: 4,
    },
    userBio: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    contactContainer: {
        width: '100%',
        alignItems: 'center',
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
    contactItem: {
        flexDirection: 'row',
        alignItems: 'left',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        padding: 20,
        marginBottom: 10,
        width: '100%',
    },
    contactText: {
        fontSize: 16,
        color: '#FFF',
        marginLeft: 10,
    },
    actionContainer: {
        width: '100%',
        alignItems: 'center',
    },
    gridContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionItem: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
    },
    editProfileButton: {
        backgroundColor: '#2f80ed',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        width: '100%',
        alignSelf: 'center',
    },
    editProfileText: {
        color: '#FFF',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '85%',
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#000',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#FFF',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    modalButton: {
        borderRadius: 8,
        padding: 12,
        width: '45%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ff4444',
    },
    saveButton: {
        backgroundColor: '#2f80ed',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
});