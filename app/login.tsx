import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
    Switch,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '@/src/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {doc, setDoc, getDoc, collection, query, getDocs, where} from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';


const { width, height } = Dimensions.get('window');

// Method to check if a username already exists in Firestore
const checkUsernameExists = async (username: string, currentUserId?: string) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (currentUserId) {
            return querySnapshot.docs.some(doc => doc.id !== currentUserId);
        }

        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking username:", error);
        throw error;
    }
};

// Login functional component: Handles user login and registration.
const Login = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login, register, loading, error } = useAuth();

    // Method to toggle password visibility in the input field
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Method to handle user login
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password');
            return;
        }

        try {
            await login(email, password, rememberMe);
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    // Method to handle user registration
    const handleRegister = async () => {
        if (!username || !email || !password) {
            Alert.alert('Error', 'Please fill out all fields to register.');
            return;
        }

        try {
            // Check if username already exists
            const usernameExists = await checkUsernameExists(username);
            if (usernameExists) {
                Alert.alert('Error', 'Username already taken. Please choose another.');
                return;
            }

            await register(username, email, password);
        } catch (error) {
            console.error('Registration error:', error);
        }
    };

    // Method to send a password reset email
    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Success', 'Password reset email sent. Check your inbox.');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    // Method to toggle the "Remember Me" switch
    const toggleRememberMe = () => {
        setRememberMe((prev) => !prev);
    };

    // Show loading indicator when authentication is in progress
    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    return (
        <LinearGradient colors={['#000428', '#004e92']} style={styles.gradient}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/images/logo-no-background.png')}
                        style={styles.banner}
                        resizeMode="contain"
                    />
                    <Text style={styles.captionLine1}>Calendar Organization System</Text>
                    <Text style={styles.captionLine2}>Modular, Interactive, Connected</Text>
                </View>

                {/* Login or Registration Form Section */}
                <View style={styles.formContainer}>
                    <Text style={styles.subtitle}>
                        {isRegistering ? 'Register to get started' : 'Login to continue'}
                    </Text>

                    {/* Username Input (only for registration) */}
                    {isRegistering && (
                        <View style={styles.inputContainer}>
                            <MaterialIcons name="person" size={20} color="#666" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor="#999"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="email" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <MaterialIcons name="lock" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        {/* Password visibility toggle button */}
                        <TouchableOpacity
                            onPress={togglePasswordVisibility}
                            style={styles.visibilityIcon}
                        >
                            <MaterialIcons
                                name={showPassword ? "visibility" : "visibility-off"}
                                size={24}
                                color="#666"
                            />
                        </TouchableOpacity>
                    </View>


                    {/* Remember Me toggle (only for login) */}
                    {!isRegistering && (
                        <View style={styles.rememberMeContainer}>
                            <Switch
                                trackColor={{ false: '#ccc', true: '#004e92' }}
                                thumbColor={rememberMe ? '#fff' : '#888'}
                                onValueChange={toggleRememberMe}
                                value={rememberMe}
                            />
                            <Text style={styles.rememberMeText}>Remember Me</Text>
                        </View>
                    )}

                    {/* Submit Button (Login or Register) */}
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={isRegistering ? handleRegister : handleLogin}
                    >
                        <Text style={styles.buttonText}>{isRegistering ? 'Register' : 'Login'}</Text>
                    </TouchableOpacity>

                    {/* Forgot Password link (only for login) */}
                    {!isRegistering && (
                        <TouchableOpacity
                            style={styles.forgotPasswordContainer}
                            onPress={handleResetPassword}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    {/* Toggle between Login and Register forms */}
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>
                            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                        </Text>
                        <TouchableOpacity onPress={() => setIsRegistering((prev) => !prev)}>
                            <Text style={styles.registerLink}>
                                {isRegistering ? 'Login' : 'Register'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Display authentication errors */}
                {error && <Text style={styles.errorText}>{error}</Text>}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FF6B6B',
        textAlign: 'center',
        marginVertical: 10,
        fontSize: 14,
    },

    visibilityIcon: {
        padding: 5,
    },

    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    banner: {
        width: width * 0.8,
        height: height * 0.15,
    },
    captionLine1: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    captionLine2: {
        color: 'white',
        fontSize: 14,
        marginTop: 5,
    },
    formContainer: {
        width: '90%',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 15,
    },
    subtitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        height: 50,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#333',
        height: '100%',
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    rememberMeText: {
        color: 'white',
        marginLeft: 10,
    },
    loginButton: {
        backgroundColor: '#004e92',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'white',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    registerText: {
        color: 'white',
    },
    registerLink: {
        color: '#8ee3f5',
        fontWeight: 'bold',
    },
    forgotPasswordContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    forgotPasswordText: {
        color: '#8ee3f5',
    },
});

export default Login;