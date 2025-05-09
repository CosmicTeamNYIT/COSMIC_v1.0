import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, TextInput, ScrollView, Alert, Switch, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from "expo-status-bar";
import moment from 'moment';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import { db, auth } from '@/src/firebaseConfig';
import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import {router} from "expo-router";

const colors = [
    '#1E90FF',
    '#00BFFF',
    '#32CD32',
    '#f6d137',
    '#FF8C00',
    '#FF4500',
    '#DC143C',
    '#FF69B4',
    '#BA55D3',
    '#6A5ACD',
    '#7B68EE',
    '#8A2BE2',
    '#D2691E',
    '#A0522D',
    '#FF6347',
    '#FF1493',
    '#FFB6C1',
    '#DDA0DD',
    '#4682B4',
    '#5F9EA0',
    '#66CDAA',
];

export default function Homescreen() {
    const [events, setEvents] = useState({});
    const [nextId, setNextId] = useState(1);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [eventName, setEventName] = useState<string>('');
    const [eventDescription, setEventDescription] = useState<string>('');
    const [eventStartTime, setEventStartTime] = useState<string>('');
    const [eventEndTime, setEventEndTime] = useState<string>('');
    const [eventLocation, setEventLocation] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>(colors[0]);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [calendarModalVisible, setCalendarModalVisible] = useState<boolean>(false);
    const [isShared, setIsShared] = useState<boolean>(false);
    const [username, setUsername] = useState('User');
    const rotationAnim = useRef(new Animated.Value(0)).current;
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Method to load events and username from Firestore
    const loadEventsAndUsername = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log("No user currently logged in.");
                return;
            }

            // Load username from Firestore
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUsername(userData.username || 'Friend');
                }
            } catch (error) {
                console.error('Error loading username:', error);
            }

            // Load events from Firestore
            const eventsQuery = query(
                collection(db, "events"),
                where("userId", "==", currentUser.uid),
                orderBy("date", "asc")
            );

            const unsubscribe = onSnapshot(eventsQuery, (querySnapshot) => {
                const firestoreEvents = {};

                querySnapshot.forEach((doc) => {
                    const event = doc.data();
                    const eventDate = event.date;

                    if (!firestoreEvents[eventDate]) {
                        firestoreEvents[eventDate] = [];
                    }

                    firestoreEvents[eventDate].push({
                        ...event,
                        id: doc.id,
                        color: event.color || colors[0],
                    });
                });

                setEvents(firestoreEvents);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    useEffect(() => {
        loadEventsAndUsername();
    }, []);

    // Method to set up form for adding event for a specific date
    const handleAddEventForDate = (date) => {
        setEventName('');
        setEventDescription('');
        setEventStartTime('');
        setEventEndTime('');
        setEventLocation('');
        setSelectedColor(colors[0]);
        setIsShared(false);
        setEventDate(date);
        setEditingEventId(null);
    };

    // Method to refresh event data with animation
    const refreshData = async () => {
        // Animate the button rotation
        Animated.timing(rotationAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start(() => {
            // Reset rotation value after animation completes
            rotationAnim.setValue(0);
        });
        // Call the existing function to load events from Firestore
        await loadEventsAndUsername();
    };

    // Create an interpolation for rotation animation
    const spin = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    // Method to handle adding or updating an event in Firestore
    const handleAddOrUpdateEvent = async () => {
        if (!eventName.trim()) {
            Alert.alert('Error', 'Event name is required.');
            return;
        }
        if (!eventDate) {
            Alert.alert('Error', 'Event date is required.');
            return;
        }
        if (!selectedColor) {
            Alert.alert('Error', 'Event color is required.');
            return;
        }

        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true); // Disable the button

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert("Not logged in", "Please log in to add events.");
                return;
            }

            const eventData = {
                name: eventName,
                description: eventDescription || '',
                date: eventDate,
                startTime: eventStartTime || '',
                endTime: eventEndTime || '',
                location: eventLocation || '',
                color: selectedColor,
                isShared: isShared,
                userId: currentUser.uid,
                createdAt: new Date().toISOString()
            };
            if (editingEventId !== null) {
                const eventRef = doc(db, "events", editingEventId);
                await updateDoc(eventRef, eventData);
            } else {
                await addDoc(collection(db, "events"), eventData);
            }

            setModalVisible(false);
            resetForm();
            // resetForm will also set modalVisible to false

        } catch (error) {
            console.error('Error saving event to Firestore:', error);
            Alert.alert('Error', 'Failed to save event. Please try again.');
        } finally {
            setIsSubmitting(false); // Re-enable the button
        }
    };

    // Method to reset the event form fields
    const resetForm = () => {
        setEventName('');
        setEventDescription('');
        setEventStartTime('');
        setEventEndTime('');
        setEventLocation('');
        setSelectedColor(colors[0]);
        setEventDate(new Date().toISOString().split('T')[0]);
        setEditingEventId(null);
        setIsShared(false);
        setModalVisible(false);
        setIsSubmitting(false); // Ensure isSubmitting is reset
    };

    // Method to handle pressing an event item to show details
    const handleEventPress = (event) => {
        setSelectedEvent(event);
        setDetailModalVisible(true);
    };

    // Method to open the modal for editing an event
    const handleEditEvent = (event) => {
        if (!event || !event.id) {
            console.error("Event is undefined or missing ID:", event);
            Alert.alert("Error", "Cannot edit this event - ID is missing");
            return;
        }

        setEditingEventId(event.id);
        setEventName(event.name || '');
        setEventDescription(event.description || '');
        setEventDate(event.date);
        setEventStartTime(event.startTime || '');
        setEventEndTime(event.endTime || '');
        setEventLocation(event.location || '');
        setSelectedColor(event.color || colors[0]);
        setIsShared(event.isShared !== undefined ? event.isShared : false);
        setDetailModalVisible(false);
        setModalVisible(true);
    };

    // Method to handle deleting an event from Firestore
    const handleDeleteEvent = async (eventId) => {
        Alert.alert(
            "Delete Event",
            "Are you sure you want to delete this event?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            if (!eventId) {
                                console.error("No event ID provided for deletion");
                                return;
                            }

                            const eventRef = doc(db, "events", eventId);
                            await deleteDoc(eventRef);
                            setDetailModalVisible(false);
                        } catch (error) {
                            console.error("Error deleting event:", error);
                            Alert.alert("Error", "Failed to delete event. Please try again.");
                        }
                    }
                }
            ],
            { cancelable: false }
        );
    };

    // Method to get a time-based greeting for the user
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good Morning, ${username}!`;
        else if (hour < 18) return `Good Afternoon, ${username}!`;
        else return `Good Evening, ${username}!`;
    };

    // Method to select a date from the calendar modal
    const onDateSelect = (day) => {
        setEventDate(day.dateString);
        setCalendarModalVisible(false);
    };

    const handleAddEvent = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert("Not logged in", "Please log in to add events.");
                return;
            }

            const eventData = {
                name: eventName,
                description: eventDescription,
                startTime: eventStartTime,
                endTime: eventEndTime,
                location: eventLocation,
                color: selectedColor,
                date: eventDate,
                shared: isShared,
                userId: currentUser.uid,
            };
            const docRef = await addDoc(collection(db, "events"), eventData);
            console.log("Document written with ID: ", docRef.id);
            setEventName('');
            setEventDescription('');
            setEventStartTime('');
            setEventEndTime('');
            setEventLocation('');
            setSelectedColor(colors[0]);
            setEventDate(new Date().toISOString().split('T')[0]);
            setIsShared(false);
            setModalVisible(false);

        } catch (error) {
            console.error("Error adding event:", error);
            Alert.alert("Error", "Could not add event.");
        }
    };

    // Method to format event data for the calendar's marked dates
    const getMarkedDates = () => {
        const marked = {};
        Object.keys(events).forEach(date => {
            const dots = events[date].map(event => ({ key: event.id, color: event.color }));
            if (dots.length > 0) {
                marked[date] = { dots: dots };
            }
        });
        marked[selectedDate] = { ...marked[selectedDate], selected: true, selectedColor: '#2f80ed' };
        return marked;
    };

    return (

        <LinearGradient colors={['#000428', '#004e92']} style={styles.gradient}>
            <StatusBar style="light" />

            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{getGreeting()}</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <MaterialIcons name="refresh" size={24} color="#333333" />
                        </Animated.View>
                    </TouchableOpacity>

                </View>

                <ScrollView style={styles.eventList}>
                    {Object.keys(events).sort((a, b) => new Date(a) - new Date(b)).map((dateKey) => {
                        const dayEvents = events[dateKey] || [];
                        return (
                            <View key={dateKey}>
                                <Text style={styles.eventDateHeader}>
                                    {moment(dateKey).format('MMMM D,YYYY')}
                                </Text>
                                {dayEvents.length ? dayEvents.map((event) => (
                                    <TouchableOpacity key={event.id} onPress={() => handleEventPress(event)}>
                                        <View style={[styles.eventItem, { backgroundColor: event.color }]}>
                                            <View style={styles.iconContainer}>
                                                {event.isShared ? (
                                                    <FontAwesome name="star" size={20} color="gold" />
                                                ) : (
                                                    <FontAwesome name="star-o" size={20} color="#FFF" />
                                                )}
                                            </View>

                                            <Text style={styles.eventDescriptionBold} numberOfLines={1}>
                                                {event.name}
                                            </Text>


                                            <View style={styles.actionIcons}>
                                                {event.location ? (
                                                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(protected)/maps')}>
                                                        <Ionicons name="location" size={18} color="white" />
                                                    </TouchableOpacity>
                                                ) : null}
                                                <TouchableOpacity style={styles.actionButton} onPress={() => handleEditEvent(event)}>
                                                    <Ionicons name="pencil" size={18} color="white" />
                                                </TouchableOpacity>

                                                <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteEvent(event.id)}>
                                                    <MaterialIcons name="delete" size={18} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )) : (
                                    <Text style={styles.noEventsText}>No events scheduled for this date.</Text>
                                )}
                            </View>
                        );
                    })}

                    {Object.keys(events).length === 0 && (
                        <Text style={styles.noEventsText}>No events scheduled.</Text>
                    )}
                </ScrollView>


                <View style={styles.calendarContainer}>
                    <Calendar
                        current={selectedDate}
                        style={styles.calendar}
                        onDayPress={(day) => {
                            setSelectedDate(day.dateString);
                            setEventDate(day.dateString);
                        }}
                        markedDates={getMarkedDates()}
                        theme={{
                            backgroundColor: '#FFFFFF',
                            calendarBackground: '#FFFFFF',
                            textSectionTitleColor: '#000000',
                            selectedDayBackgroundColor: '#2f80ed',
                            todayTextColor: '#2f80ed',
                            dayTextColor: '#000000',
                            monthTextColor: '#000000',
                            arrowColor: '#000000',
                            'stylesheet.calendar.header': {
                                dayHeader: {
                                    color: '#000000'
                                }
                            }
                        }}
                        horizontal
                        pagingEnabled
                        markingType={'multi-dot'}
                    />
                </View>

                <TouchableOpacity onPress={() => {
                    setModalVisible(true);
                }} style={styles.addIcon}>
                    <Ionicons name="add" size={30} color="#FFF" />
                </TouchableOpacity>


                {/* Event Creation Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={styles.keyboardAvoidingView}
                        >
                            <ScrollView contentContainerStyle={styles.modalContent}>
                                <Text style={styles.modalTitle}>
                                    {editingEventId !== null ? 'Edit Event' : 'Add Event'}
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Event Name"
                                    value={eventName}
                                    onChangeText={setEventName}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Event Description"
                                    value={eventDescription || ''}
                                    onChangeText={setEventDescription}
                                    multiline={true}
                                />

                                <TouchableOpacity onPress={() => setCalendarModalVisible(true)} style={styles.datePickerButton}>
                                    <Text style={styles.datePickerText}>Select Date: {eventDate}</Text>
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Start Time (HH:mm)"
                                    value={eventStartTime || ''}
                                    onChangeText={setEventStartTime}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="End Time (HH:mm)"
                                    value={eventEndTime || ''}
                                    onChangeText={setEventEndTime}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Location (Optional)"
                                    value={eventLocation || ''}
                                    onChangeText={setEventLocation}
                                />

                                {/* Shared Event Switch */}
                                <View style={styles.sharedEventContainer}>
                                    <Text style={styles.sharedLabel}>Shared Event</Text>
                                    <Switch
                                        value={isShared}
                                        onValueChange={setIsShared}
                                        thumbColor={isShared ? "#f5dd4b" : "#f4f3f4"}
                                        trackColor={{ false: "#767577", true: "#91842a" }}
                                    />
                                </View>

                                <Text style={styles.colorLabel}>Choose Color:</Text>
                                <ScrollView horizontal={true} style={styles.colorPicker}>
                                    {colors.map((color, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: color },
                                                selectedColor === color && styles.selectedColorCircle,
                                            ]}
                                            onPress={() => setSelectedColor(color)}
                                        />
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    onPress={handleAddOrUpdateEvent}
                                    style={[
                                        styles.modalAddButton,
                                        { opacity: (eventName && eventDate && selectedColor && !isSubmitting) ? 1 : 0.5 }
                                    ]}
                                    disabled={!(eventName && eventDate && selectedColor) || isSubmitting}
                                >
                                    <Text style={styles.modalAddButtonText}>
                                        {editingEventId !== null ? 'Update Event' : 'Add Event'}
                                    </Text>
                                </TouchableOpacity>


                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert(
                                            'Work in Progress',
                                            'Due to the lack of updated OCR libraries and free AI API Keys, this feature is unfinished',
                                            [
                                                { text: 'OK', onPress: () => {} },
                                            ],
                                            { cancelable: false }
                                        );
                                    }}
                                >
                                    <View style={styles.CameraButtonContainer}>
                                        <View style={styles.CameraButtonIcon}>
                                            <Ionicons name="camera" size={20} color="white" />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={resetForm} style={styles.modalCancelButtonContainer}>
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <View style={{ height: 50 }} />


                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* Calendar Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={calendarModalVisible}
                    onRequestClose={() => setCalendarModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select a Date</Text>
                            <Calendar
                                onDayPress={onDateSelect}
                                markedDates={{
                                    [eventDate]: { selected: true, selectedColor: '#2f80ed' },
                                }}
                                theme={{
                                    backgroundColor: '#FFFFFF',
                                    calendarBackground: '#FFFFFF',
                                    textSectionTitleColor: '#000000',
                                    selectedDayBackgroundColor: '#2f80ed',
                                    todayTextColor: '#2f80ed',
                                    dayTextColor: '#000000',
                                    monthTextColor: '#000000',
                                    arrowColor: '#000000',
                                }}
                            />
                            <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Event Details Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={detailModalVisible}
                    onRequestClose={() => setDetailModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Event Details</Text>
                            {selectedEvent && (
                                <>
                                    <Text style={styles.detailText}>Name: {String(selectedEvent.name)}</Text>
                                    <Text style={styles.detailText}>Description: {String(selectedEvent.description)}</Text>
                                    <Text style={styles.detailText}>Date: {moment(selectedEvent.date).format('MMM D,YYYY')}</Text>

                                    {!!selectedEvent.startTime && (
                                        <Text style={styles.detailText}>Start Time: {String(selectedEvent.startTime)}</Text>
                                    )}
                                    {!!selectedEvent.endTime && (
                                        <Text style={styles.detailText}>End Time: {String(selectedEvent.endTime)}</Text>
                                    )}
                                    {!!selectedEvent.location && (
                                        <Text style={styles.detailText}>Location: {String(selectedEvent.location)}</Text>
                                    )}
                                    <Text style={styles.detailText}>Shared: {selectedEvent.isShared ? 'Yes' : 'No'}</Text>
                                </>
                            )}
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Close</Text>
                            </TouchableOpacity>
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
    },
    keyboardAvoidingView: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
    },

    CameraButtonContainer: {
        backgroundColor: '#007BFF',
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,

    },
    CameraButtonIcon : {
        color: 'white',
        justifyContent: "center",
        alignItems: 'center',
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 24,
        paddingBottom: 18,
    },
    title: {
        fontSize: 18,
        fontWeight: 'regular',
        color: '#333333',
        textAlign: 'left',
        marginLeft: 10,
    },
    headerContainer: {
        marginTop: 25,
        marginBottom: 10,
        padding: 5,
        backgroundColor: 'white',
        borderRadius: 30,
        width: '100%',
        alignSelf: "center",
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedColorCircle: {
        borderColor: '#333333',
        borderWidth: 2,
    },
    refreshButton: {
        padding: 5,
        marginRight: 10,
    },
    eventList: {
        flex: 1,
        marginBottom: 15,
    },
    eventItem: {
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        elevation: 5,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',


    },

    eventDescriptionBold: {
        flex: 1,
        fontSize: 14,
        color: '#FFF',
        fontWeight: 'bold',
        marginHorizontal: 10,


    },

    eventDate: {
        fontSize: 12,
        color: '#FFF',
        marginTop: 4,
    },
    eventLocation: {
        fontSize: 12,
        color: '#FFF',
        marginTop: 4,
    },
    noEventsText: {
        paddingTop: 10,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    eventDateHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginVertical: 10,
    },
    calendarContainer: {
        marginBottom: 15,
        overflow: 'hidden',
        borderRadius: 15,
    },
    calendar: {
        borderRadius: 15,
        paddingBottom: 10,
    },
    addIcon: {
        backgroundColor: '#2f80ed',
        borderRadius: 30,
        height:40,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',

    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',

    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        alignSelf: 'center',

    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        borderBottomWidth: 0,
        borderColor: 'transparent',
    },
    sharedEventContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

        marginVertical: 0,
    },
    sharedLabel: {
        fontSize: 16,
        fontWeight: 'regular',
        color: '#000',
        marginRight: 10,

    },
    colorLabel: {
        fontSize: 16,
        marginBottom: 10,
        marginTop: 10,
        fontWeight: 'regular',
    },
    colorPicker: {
        flexDirection: 'row',
        marginBottom: 15,
        paddingBottom: 15,
        marginVertical: 10,
    },
    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    selectedColorCircle: {
        borderWidth: 2,
        borderColor: '#333333',
    },
    modalAddButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    modalAddButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 0,
    },
    cancelButtonText: {
        color: '#007BFF',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    modalCancelButtonContainer: {
        backgroundColor: '#FF4500',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: 'center',


    },
    modalCancelButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 0,
    },
    detailText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#000',
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',


    },

    icon: {
        marginLeft: 10,

    },

    datePickerButton: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        marginVertical: 5,
        alignItems: 'flex-start',
    },
    datePickerText: {
        fontSize: 16,
        color: '#333333',
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        marginLeft: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textArea: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        height: 100,
        textAlignVertical: 'top',
    },
    clearButton: {
    },
    clearButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        alignSelf: 'flex-end',
        backgroundColor: 'white',
        width: '25%',
        borderRadius: 30,
        padding: 5,

    },
    clearButtonText: {
        fontSize: 18,
        color: '#333333',
        fontWeight: 'regular',
        justifyContent: 'marginRight',
        alignItems: 'center',
        textAlign: 'right',


    }
});