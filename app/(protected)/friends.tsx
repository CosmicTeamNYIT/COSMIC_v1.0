import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { db, auth } from '@/src/firebaseConfig';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
} from 'firebase/firestore';
import Fuse from 'fuse.js';
import { router } from "expo-router";


const wait = (timeout) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

export default function FriendsScreen() {
    const [friends, setFriends] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const allUsersFetched = useRef(false);
    const isInitialLoad = useRef(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadFriends();
        fetchAllUsersInBackground();
        isInitialLoad.current = false;
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAllUsersInBackground().then(() => setRefreshing(false));
    }, []);

    const loadFriends = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log("No user currently logged in.");
                return;
            }

            const friendsRef = collection(db, "users", currentUser.uid, "friends");
            const friendsSnapshot = await getDocs(friendsRef);
            const friendsList = [];

            const friendPromises = friendsSnapshot.docs.map(async (docSnapshot) => {
                const friendData = docSnapshot.data();
                const friendId = friendData.userId;

                try {
                    const userDoc = await getDoc(doc(db, "users", friendId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        friendsList.push({
                            id: docSnapshot.id,
                            userId: friendId,
                            username: userData.username || '@' + friendId.substring(0, 8)
                        });
                    }
                } catch (error) {
                    console.error("Error getting friend data:", error);
                }
            });

            await Promise.all(friendPromises);
            setFriends(friendsList);
            // Only set loading to false if all users have been fetched or the initial load is done
            if (allUsersFetched.current || !isInitialLoad.current) {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error loading friends:", error);
            if (!allUsersFetched.current && isInitialLoad.current) {
                setLoading(false); // In case fetching friends fails before all users
            }
        }
    };

    const fetchAllUsersInBackground = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log("No user currently logged in for fetching all users.");
                return;
            }

            const usersRef = collection(db, "users");
            const querySnapshot = await getDocs(usersRef);

            const usersData = [];
            querySnapshot.forEach((doc) => {
                if (doc.id !== currentUser.uid) {
                    const userData = doc.data();
                    usersData.push({
                        id: doc.id,
                        username: userData.username || '@' + doc.id.substring(0, 8),
                        email: userData.email || 'No email',
                    });
                }
            });

            setAllUsers(usersData);
            allUsersFetched.current = true;
            // Only set loading to false after both friends and all users are attempted to be fetched on initial load
            if (!loading && !isInitialLoad.current) {
                setLoading(false);
            } else if (isInitialLoad.current && friends.length > 0) {
                setLoading(false);
            } else if (isInitialLoad.current && usersData.length > 0) {
                setLoading(false);
            } else if (isInitialLoad.current && usersData.length === 0 && friends.length === 0) {
                setLoading(false);
            }
            return Promise.resolve(); // Indicate completion for refresh control
        } catch (error) {
            console.error("Error fetching all users:", error);
            Alert.alert("Error", "Failed to fetch users");
            setLoading(false);
            return Promise.reject(error); // Indicate failure for refresh control
        }
    };

    const searchUsers = useCallback(() => {
        if (!searchText.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        // Get the user IDs of the current friends
        const friendUserIds = friends.map(friend => friend.userId);

        // Filter out already added friends from allUsers
        const usersToSearch = allUsers.filter(user => !friendUserIds.includes(user.id));

        const fuse = new Fuse(usersToSearch, {
            keys: ['username', 'email'],
            threshold: 0.3,
        });

        const results = fuse.search(searchText).map(result => result.item);
        setSearchResults(results);
    }, [searchText, allUsers, friends]);

    useEffect(() => {
        searchUsers();
    }, [searchText, searchUsers]);

    const addFriend = async (userId) => {
        console.log("Attempting to add friend with userId:", userId);

        try {
            const currentUser = auth.currentUser;
            console.log("Current user:", currentUser ? currentUser.uid : "No user");

            if (!currentUser) {
                console.log("addFriend failed: No user currently logged in.");
                return;
            }

            const friendDocRef = doc(db, "users", currentUser.uid, "friends", userId);
            console.log("Firestore friend document reference:", friendDocRef.path);

            const dataToWrite = {
                userId: userId,
                addedAt: new Date().toISOString()
            };
            console.log("Data being written to Firestore:", dataToWrite);

            await setDoc(friendDocRef, dataToWrite);

            console.log("Friend added successfully in Firestore for userId:", userId);
            Alert.alert("Success", "Friend added successfully!");
            loadFriends(); // Refresh friends list
        } catch (error) {
            console.error("Error adding friend:", error.message, error);
            Alert.alert("Error", "Failed to add friend");
        }
    };

    const removeFriend = async (friendDocId) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            await deleteDoc(doc(db, "users", currentUser.uid, "friends", friendDocId));

            Alert.alert("Success", "Friend removed successfully!");
            loadFriends(); // Refresh friends list
        } catch (error) {
            console.error("Error removing friend:", error);
            Alert.alert("Error", "Failed to remove friend");
        }
    };

    // Function to navigate to friend's info screen
    const navigateToFriendInfo = (friendUserId) => {
        // Navigate to the friendsInfo route, passing the userId as a parameter
        router.push({
            pathname: '/friendsInfo',
            params: { userId: friendUserId }
        });
    };


    return (
        <LinearGradient colors={['#2A0845', '#6441A5']}
                        style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.headerText}>Friends</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for users..."
                    placeholderTextColor="#aaa"
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            )}

            {/* Display search results with RefreshControl */}
            {isSearching && (
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultTitle}>
                        {searchResults.length > 0
                            ? `Found ${searchResults.length} users`
                            : "No users found"}
                    </Text>
                    <ScrollView
                        style={styles.resultsList}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="white"
                            />
                        }
                    >
                        {searchResults.map((user) => (
                            <View key={user.id} style={styles.userItem}>
                                <View style={styles.userInfo}>
                                    <Text style={styles.username}>{user.username}</Text>
                                    {user.email && <Text style={styles.userEmail}>Email: {user.email}</Text>}
                                </View>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => addFriend(user.id)}
                                >
                                    <Icon name="person-add" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Display friends list with RefreshControl */}
            {!isSearching && (
                <>
                    <Text style={styles.friendsTitle}>
                        {friends.length > 0 ? "Your Friends" : "You don't have any friends yet"}
                    </Text>
                    <ScrollView
                        style={styles.friendsList}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="white"
                            />
                        }
                    >
                        {friends.map((friend) => (

                            <TouchableOpacity
                                key={friend.id}
                                style={styles.friendItem}
                                onPress={() => navigateToFriendInfo(friend.userId)}
                            >
                                <Text style={styles.friendName}>{friend.username}</Text>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeFriend(friend.id)}
                                >
                                    <Icon name="trash-outline" size={20} color="white" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginTop: 40,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        padding: 10,
        color: 'white',
        marginRight: 10,
    },
    searchButton: {
        backgroundColor: '#915eef',
        borderRadius: 10,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fetchAllButton: {
        backgroundColor: '#915eef',
        padding: 10,
        borderRadius: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    fetchAllButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsContainer: {
        marginTop: 20,
        flex: 1,
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    resultsList: {
        flex: 1,
    },
    userItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userId: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
    userEmail: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginTop: 2,
    },
    addButton: {
        backgroundColor: '#4a69bd',
        borderRadius: 8,
        padding: 8,
    },
    friendsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    friendsList: {
        flex: 1,
    },
    friendItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    friendName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    removeButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 8,
        padding: 8,
    },
});