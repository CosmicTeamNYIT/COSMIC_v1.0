// app/(protected)/(tabs)/social.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ScrollView, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect } from "expo-router";
import { db, auth } from '@/src/firebaseConfig';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
} from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';

interface Friend {
    id: string;
    userId: string;
    username?: string;
}

interface Event {
    id: string;
    name: string;
    description?: string;
    date: string | { toDate: () => Date };
    startTime?: string;
    endTime?: string;
    location?: string;
    color: string;
    isShared: boolean;
    userId: string;
    createdAt: string | { toDate: () => Date };
    username?: string;
}

// SocialScreen functional component: Displays shared events from the user and their friends.
export default function SocialScreen() {
    const [allSharedEvents, setAllSharedEvents] = useState<Event[]>([]);
    const [filteredSharedEvents, setFilteredSharedEvents] = useState<Event[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Filter states
    const [hideOwnEvents, setHideOwnEvents] = useState<boolean>(false);
    const currentUserUid = auth.currentUser?.uid;

    // Helper method to fetch username by user ID from Firestore
    const getUsernameById = useCallback(async (userId: string): Promise<string> => {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.username || `User ${userId.substring(0, 5)}`;
            }
            return `User ${userId.substring(0, 5)}`;
        } catch (error) {
            console.error("Error getting username:", error);
            return `User ${userId.substring(0, 5)}`;
        }
    }, []);

    // Method to fetch shared events from the current user and their friends from Firestore
    const fetchSharedEvents = useCallback(async (isRefreshing = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            if (!currentUserUid) {
                console.log("No user currently logged in.");
                return;
            }

            const userFriendsRef = collection(db, "users", currentUserUid, "friends");
            const friendsSnapshot = await getDocs(userFriendsRef);
            const friendsList: Friend[] = [];
            const friendIds: string[] = [];

            friendsSnapshot.forEach((doc) => {
                const friendData = doc.data();
                const friendUserId = friendData.userId;
                if (friendUserId) {
                    friendsList.push({
                        id: doc.id,
                        userId: friendUserId,
                        ...friendData
                    });
                    friendIds.push(friendUserId);
                } else {
                    console.warn(`Friend document ${doc.id} is missing userId field`);
                }
            });
            setFriends(friendsList);

            const idsToQuery = friendIds.length > 0 ? [...friendIds, currentUserUid] : [currentUserUid];

            let eventsList: Event[] = [];
            if (idsToQuery.length > 0) {
                const eventsQuery = query(
                    collection(db, "events"),
                    where("userId", "in", idsToQuery),
                    where("isShared", "==", true),
                    orderBy("date", "desc")
                );

                const eventsSnapshot = await getDocs(eventsQuery);
                const eventPromises = eventsSnapshot.docs.map(async (doc) => {
                    const eventData = doc.data();
                    if (eventData && typeof eventData.userId === 'string' && typeof eventData.isShared === 'boolean' && eventData.isShared === true) {
                        try {
                            const username = await getUsernameById(eventData.userId);
                            return {
                                id: doc.id,
                                ...eventData as Omit<Event, 'id' | 'username'>,
                                username: username,
                                date: eventData.date,
                                createdAt: eventData.createdAt,
                            } as Event;
                        } catch (error) {
                            console.error(`Error fetching username for event ${doc.id}:`, error);
                            return {
                                id: doc.id,
                                ...eventData as Omit<Event, 'id' | 'username'>,
                                username: "Unknown User",
                                date: eventData.date,
                                createdAt: eventData.createdAt,
                            } as Event;
                        }
                    } else {
                        return null;
                    }
                });
                const resolvedEvents = await Promise.all(eventPromises);
                eventsList = resolvedEvents.filter(event => event !== null) as Event[];

                // Sort events client-side by date (earliest to latest)
                eventsList.sort((a, b) => {
                    const dateA = typeof a.date === 'string' ? moment(a.date).valueOf() : (a.date as any)?.toDate().valueOf();
                    const dateB = typeof b.date === 'string' ? moment(b.date).valueOf() : (b.date as any)?.toDate().valueOf();

                    // Handle potential invalid dates gracefully
                    if (isNaN(dateA) || dateA === undefined) return 1;
                    if (isNaN(dateB) || dateB === undefined) return -1;

                    return dateA - dateB;
                });
            }
            setAllSharedEvents(eventsList);
        } catch (error) {
            console.error("Error fetching shared events:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentUserUid, getUsernameById]);

    // Effect hook to fetch data when the component mounts or fetchSharedEvents changes
    useEffect(() => {
        fetchSharedEvents();
    }, [fetchSharedEvents]);

    // Method to apply filters to the list of shared events
    const applyFilters = () => {
        let filteredEvents = [...allSharedEvents];

        // Hide own events if the filter is enabled and user is logged in
        if (hideOwnEvents && currentUserUid) {
            filteredEvents = filteredEvents.filter(event => {
                return event.userId !== currentUserUid;
            });
        }

        setFilteredSharedEvents(filteredEvents);
    };

    // Effect hook to apply filters whenever the raw event list or filter settings change
    useEffect(() => {
        applyFilters();
    }, [allSharedEvents, hideOwnEvents, currentUserUid]);

    // Method for pull-to-refresh functionality
    const onRefresh = useCallback(() => {
        fetchSharedEvents(true);
    }, [fetchSharedEvents]);

    // Method to handle viewing event details when an event card is pressed
    const handleViewEventDetails = (event: Event) => {
        setSelectedEvent(event);
        setDetailModalVisible(true);
    };

    // Helper method to format date from string or Firestore Timestamp
    const formatDate = useCallback((date: any): string => {
        if (!date) return 'Unknown date';
        let momentDate;
        // Check if it's a Firestore Timestamp object
        if (date && typeof date === 'object' && typeof date.toDate === 'function') {
            momentDate = moment(date.toDate()).local();
        } else if (typeof date === 'string') {
            // Check if it's a valid date string
            const parsedDate = moment(date);
            if (parsedDate.isValid()) {
                momentDate = parsedDate;
            } else {
                return 'Invalid date format';
            }
        } else {
            return 'Invalid date type';
        }
        return momentDate.format('MMMM D,YYYY');
    }, []);

    // Method to navigate to the add friends screen
    const navigateToAddFriends = useCallback(() => {
        router.push('/friends');
    }, []);

    return (
        <LinearGradient colors={['#2A0845', '#6441A5']} style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.title}>Social Feed</Text>
                <TouchableOpacity style={styles.addButton} onPress={navigateToAddFriends}>
                    <Ionicons name="person-add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filtersContainer}>
                <View style={styles.hideOwnEventsFilter}>
                    <Text style={styles.filterLabel}>Hide My Events:</Text>
                    <TouchableOpacity onPress={() => setHideOwnEvents(!hideOwnEvents)} style={[styles.toggleButton, hideOwnEvents && styles.toggleButtonActive]}>
                        <Text style={styles.toggleButtonText}>{hideOwnEvents ? 'On' : 'Off'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main content area */}
            <View style={{ flex: 1 }}>
                {loading && !refreshing ? (
                    // Show main loader only on initial load
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Loading Shared Events...</Text>
                    </View>
                ) : (
                    // Loading is complete, show content or empty state
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={
                            filteredSharedEvents.length === 0 && !refreshing
                                ? styles.centeredScrollViewContent
                                : {}
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#fff"
                            />
                        }
                    >
                        {filteredSharedEvents.length > 0 ? (
                            // Scenario: Filtered events exist, render them
                            filteredSharedEvents.map((event) => {
                                return (
                                    <TouchableOpacity
                                        key={event.id}
                                        style={[styles.eventCard, { borderLeftColor: event.color || '#ccc' }]}
                                        onPress={() => handleViewEventDetails(event)}
                                    >
                                        <View style={styles.eventHeader}>
                                            <Text style={styles.eventTitle}>{event.name}</Text>
                                            <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                                        </View>
                                        {event.description ? (
                                            <Text style={styles.eventDescription} numberOfLines={2}>
                                                {event.description}
                                            </Text>
                                        ) : null}
                                        <View style={styles.eventFooter}>
                                            {event.location ? (
                                                <Text style={styles.eventLocation}>
                                                    {event.location}
                                                </Text>
                                            ) : null}
                                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                                {/* Display "You" for current user's events */}
                                                <Text style={styles.eventUser}>
                                                    Shared by: {event.userId === currentUserUid ? 'You' : event.username || 'Someone'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            // Scenario: Filtered events list is empty
                            <View style={styles.emptyContainer}>
                                {friends.length === 0 ? (
                                    // Sub-Scenario: No friends at all
                                    <>
                                        <Ionicons name="people" size={64} color="#fff" style={styles.emptyIcon} />
                                        <Text style={styles.emptyText}>
                                            No friends added yet.{'\n'}
                                            Tap the "+" button to add friends!{'\n\n'}
                                            Your shared events will appear here.
                                        </Text>
                                    </>
                                ) : (
                                    // Sub-Scenario: Friends exist, but no events match filters or no shared events from friends
                                    <>
                                        <Ionicons name="calendar" size={64} color="#fff" style={styles.emptyIcon} />
                                        <Text style={styles.emptyText}>
                                            No shared events match your current filters.
                                        </Text>
                                    </>
                                )}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>


            {/* Event Detail Modal: Displays detailed information about a selected shared event. */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={detailModalVisible}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        {selectedEvent && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedEvent.name}</Text>
                                </View>
                                <ScrollView style={styles.modalContent}>
                                    <Text style={styles.modalDate}>
                                        {formatDate(selectedEvent.date)}
                                    </Text>
                                    {selectedEvent.description ? (
                                        <Text style={styles.modalDescription}>
                                            {selectedEvent.description}
                                        </Text>
                                    ) : null}
                                    {selectedEvent.location ? (
                                        <>
                                            <Text style={styles.modalLabel}>Location:</Text>
                                            <Text style={styles.modalLocation}>
                                                {selectedEvent.location}
                                            </Text>
                                        </>
                                    ) : null}
                                    {/* Display Shared by user in modal */}
                                    {selectedEvent.username ? (
                                        <>
                                            <Text style={styles.modalLabel}>Shared by:</Text>
                                            <Text style={styles.modalUser}>
                                                {/* Display "You" in modal too */}
                                                {selectedEvent.userId === currentUserUid ? 'You' : selectedEvent.username}
                                            </Text>
                                        </>
                                    ) : null}


                                    {selectedEvent.createdAt ? (
                                        <>
                                            <Text style={styles.modalLabel}>Created On:</Text>
                                            <Text style={styles.modalLocation}>
                                                {moment(typeof selectedEvent.createdAt === 'string' ? selectedEvent.createdAt : (selectedEvent.createdAt as any).toDate()).format('MMMM D,YYYY [at] h:mm A')}
                                            </Text>
                                        </>
                                    ) : null}


                                </ScrollView>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setDetailModalVisible(false)}
                                >
                                    <Text style={styles.modalCloseButtonText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    addButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
    },
    filtersContainer: {
        marginBottom: 10,
    },
    filterLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 10,
    },
    hideOwnEventsFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    toggleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginLeft: 10,
    },
    toggleButtonActive: {
        backgroundColor: '#6441A5',
    },
    toggleButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    scrollView: {
        paddingHorizontal: 20,
    },
    centeredScrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#fff',
        fontSize: 18,
    },
    eventCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginRight: 8,
    },
    eventDate: {
        fontSize: 14,
        color: '#E0AAFF',
        textAlign: 'right',
    },
    eventDescription: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 8,
        lineHeight: 20,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    eventLocation: {
        fontSize: 12,
        color: '#B8B8B8',
        flexShrink: 1,
        marginRight: 8,
    },
    eventUser: {
        fontSize: 12,
        color: '#D9B8FF',
        flexShrink: 1,
    },
    emptyContainer: {
        padding: 20,
        minHeight: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyIcon: {
        marginBottom: 20,
        opacity: 0.7,
    },
    emptyText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        opacity: 0.7,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '85%',
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
    },
    modalContent: {
        marginBottom: 10,
    },
    modalDate: {
        fontSize: 16,
        color: '#666',
        marginBottom: 15,
    },
    modalDescription: {
        fontSize: 16,
        marginBottom: 20,
        lineHeight: 24,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 5,
    },
    modalLocation: {
        fontSize: 16,
        marginBottom: 15,
    },
    modalUser: {
        fontSize: 16,
        marginBottom: 10,
        color: '#6441A5',
    },
    modalCloseButton: {
        backgroundColor: '#6441A5',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',

    },
    modalCloseButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});