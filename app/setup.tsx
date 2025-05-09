import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { auth, db } from '@/src/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const Setup = () => {
    // username and email are passed as parameters from login/register
    const { username, email } = useLocalSearchParams<{ username: string; email: string }>();

    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [socialHandle, setSocialHandle] = useState('');


    const handlePhoneChange = (text) => {
        const numericText = text.replace(/[^0-9]/g, '');
        setPhone(numericText);
    };

    const handleCompleteSetup = async () => {

        if (!location || !bio) {
            Alert.alert('Incomplete Profile', 'Please fill in your Location and Bio to proceed.');
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert('Error', 'No authenticated user found. Please log in again.');
            router.replace('/login'); // Redirect to login if user somehow unauthenticated here
            return;
        }


        // Create profile data object

        const profileData = {
            username: username,
            email: email,
            location: location,
            bio: bio,
            phone: phone || '',
            socialHandle: socialHandle || '',
            updatedAt: new Date()
        };

        try {

            await setDoc(doc(db, "users", currentUser.uid), profileData, { merge: true });

            console.log('Profile setup complete:', profileData);

            router.replace('/');
        } catch (error) {
            console.error('Error saving profile data:', error);
            Alert.alert('Error', 'Failed to save profile data. Please try again.');
        }
    };

    return (
        <LinearGradient colors={['#000428', '#004e92']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Complete Your Profile</Text>

                {/* Username - Auto-filled and read-only */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="person" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        value={username}
                        editable={false} // Username should not be editable
                        placeholder="Username"
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Email - Auto-filled and read-only */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="email" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        value={email}
                        editable={false} // Email should not be editable
                        placeholder="Email"
                        placeholderTextColor="#999"
                    />
                </View>


                {/* Location - Required */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="place" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Location (Required)"
                        placeholderTextColor="#999"
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>

                {/* Bio - Required */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="info" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={[styles.input, styles.bioInput]}
                        placeholder="Short Bio (Required)"
                        placeholderTextColor="#999"
                        value={bio}
                        onChangeText={setBio}
                        multiline
                    />
                </View>

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="phone" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number (Optional)"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={handlePhoneChange}
                    />
                </View>


                {/* Social Media Handle */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="alternate-email" size={24} color="#666" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Social Media Handle (Optional)"
                        placeholderTextColor="#999"
                        value={socialHandle}
                        onChangeText={setSocialHandle}
                    />
                </View>

                {/* Complete Setup Button */}
                <TouchableOpacity style={styles.button} onPress={handleCompleteSetup}>
                    <Text style={styles.buttonText}>Complete Setup</Text>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 24,
        paddingBottom: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 30,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        marginBottom: 15,
        paddingHorizontal: 10,
        width: '100%',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize: 16,
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#004e92',
        borderRadius: 8,
        paddingVertical: 15,
        paddingHorizontal: 30,
        alignSelf: 'stretch',
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Setup;