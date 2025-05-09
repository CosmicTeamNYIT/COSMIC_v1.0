import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebaseConfig';
import moment from 'moment';
import { Calendar } from 'react-native-calendars';

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

export default function ManageEventsScreen() {
    const [activeTab, setActiveTab] = useState<'Personal' | 'Social'>('Personal');
    const [events, setEvents] = useState({
        Personal: [],
        Social: [],
    });
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state variables - matching index.tsx
    const [eventName, setEventName] = useState<string>('');
    const [eventDescription, setEventDescription] = useState<string>('');
    const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [eventStartTime, setEventStartTime] = useState<string>('');
    const [eventEndTime, setEventEndTime] = useState<string>('');
    const [eventLocation, setEventLocation] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>(colors[0]);
    const [isShared, setIsShared] = useState<boolean>(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [calendarModalVisible, setCalendarModalVisible] = useState<boolean>(false);

    useEffect(() => {
        const loadEventsFromFirestore = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    console.log("No user currently logged in.");
                    setLoading(false);
                    return;
                }

                const eventsQuery = query(
                    collection(db, "events"),
                    where("userId", "==", currentUser.uid)
                );

                const unsubscribe = onSnapshot(eventsQuery, (querySnapshot) => {
                    const personalEvents = [];
                    const socialEvents = [];

                    querySnapshot.forEach((doc) => {
                        const event = { ...doc.data(), id: doc.id };

                        // Sort events based on isShared property
                        if (event.isShared) {
                            socialEvents.push(event);
                        } else {
                            personalEvents.push(event);
                        }
                    });

                    setEvents({
                        Personal: personalEvents,
                        Social: socialEvents
                    });
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error loading events:", error);
                setLoading(false);
            }
        };

        loadEventsFromFirestore();
    }, []);

    const handleEventPress = (event: any) => {
        setSelectedEvent(event);
        setDetailModalVisible(true);
    };

    const handleEditEvent = (event: any) => {
        // Set all form values from the event
        setEditingEventId(event.id);
        setEventName(event.name);
        setEventDescription(event.description || '');
        setEventDate(event.date);
        setEventStartTime(event.startTime || '');
        setEventEndTime(event.endTime || '');
        setEventLocation(event.location || '');
        setSelectedColor(event.color);
        setIsShared(event.isShared);

        // Show the modal
        setModalVisible(true);
    };

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

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert("Not logged in", "Please log in to update events.");
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
                updatedAt: new Date().toISOString()
            };

            if (editingEventId !== null) {
                const eventRef = doc(db, "events", editingEventId);
                await updateDoc(eventRef, eventData);
                Alert.alert('Success', 'Event updated successfully!');
            }

            setModalVisible(false);
            resetForm();
        } catch (error) {
            console.error('Error updating event:', error);
            Alert.alert('Error', 'Failed to update event. Please try again.');
        }
    };

    const resetForm = () => {
        setEventName('');
        setEventDescription('');
        setEventDate(new Date().toISOString().split('T')[0]);
        setEventStartTime('');
        setEventEndTime('');
        setEventLocation('');
        setSelectedColor(colors[0]);
        setIsShared(false);
        setEditingEventId(null);
        setModalVisible(false);
    };

    const onDateSelect = (day) => {
        setEventDate(day.dateString);
        setCalendarModalVisible(false);
    };

    const handleRemoveEvent = (eventId: string) => {
        if (!eventId) {
            Alert.alert('Error', 'Cannot remove event: missing ID');
            return;
        }

        Alert.alert(
            'Remove Event',
            'Are you sure you want to remove this event?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const eventRef = doc(db, "events", eventId);
                            await deleteDoc(eventRef);
                            Alert.alert('Success', 'Event removed successfully!');
                        } catch (error) {
                            console.error('Error removing event:', error);
                            Alert.alert('Error', 'Failed to remove event. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    // Rest of the components being used
    return (
        <LinearGradient colors={['#000428', '#004e92']} style={styles.gradient}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Manage Events</Text>

                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Personal' && styles.activeTab]}
                        onPress={() => setActiveTab('Personal')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Personal' && styles.activeTabText]}>
                            Personal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Social' && styles.activeTab]}
                        onPress={() => setActiveTab('Social')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Social' && styles.activeTabText]}>
                            Social
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <Text style={styles.loadingText}>Loading events...</Text>
                ) : (
                    <View style={styles.eventsList}>
                        {events[activeTab].length > 0 ? (
                            events[activeTab].map((event, index) => (
                                <TouchableOpacity
                                    key={event.id || index}
                                    style={[styles.eventItem, { backgroundColor: event.color }]}
                                    onPress={() => handleEventPress(event)}
                                >
                                    <View style={styles.eventItemContent}>
                                        <Text style={styles.eventName}>{event.name}</Text>
                                        <Text style={styles.eventDate}>
                                            {moment(event.date).format('MMM D, YYYY')}
                                        </Text>
                                    </View>
                                    <View style={styles.eventActions}>
                                        <TouchableOpacity onPress={() => handleEditEvent(event)}>
                                            <Ionicons name="pencil" size={20} color="white" style={styles.actionIcon} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleRemoveEvent(event.id)}>
                                            <MaterialIcons name="delete" size={20} color="white" style={styles.actionIcon} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.noEventsText}>No {activeTab.toLowerCase()} events found.</Text>
                        )}
                    </View>
                )}

                {/* Event Detail Modal */}
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
                                    <Text style={styles.detailText}>Name: {selectedEvent.name}</Text>
                                    <Text style={styles.detailText}>Description: {selectedEvent.description}</Text>
                                    <Text style={styles.detailText}>Date: {moment(selectedEvent.date).format('MMM D, YYYY')}</Text>
                                    {selectedEvent.startTime && (
                                        <Text style={styles.detailText}>Start Time: {selectedEvent.startTime}</Text>
                                    )}
                                    {selectedEvent.endTime && (
                                        <Text style={styles.detailText}>End Time: {selectedEvent.endTime}</Text>
                                    )}
                                    {selectedEvent.location && (
                                        <Text style={styles.detailText}>Location: {selectedEvent.location}</Text>
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

                {/* Event Edit Modal - Copied from index.tsx */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    {/* Wrap the modal content in ScrollView */}
                    <View style={styles.modalContainer}>
                        <ScrollView style={styles.modalContent} contentContainerStyle={styles.scrollViewContent}>
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
                                multiline
                                numberOfLines={4}
                                style={[styles.input, styles.textArea]}
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
                                style={[styles.modalAddButton, { opacity: (eventName && eventDate && selectedColor) ? 1 : 0.5 }]}
                                disabled={!(eventName && eventDate && selectedColor)}
                            >
                                <Text style={styles.modalAddButtonText}>
                                    {editingEventId !== null ? 'Update Event' : 'Add Event'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={resetForm} style={styles.modalCancelButtonContainer}>
                                <Text style={styles.modalCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
            </ScrollView>
        </LinearGradient>

    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
        textAlign: 'center',
    },
    tabs: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        marginHorizontal: 5,
    },
    activeTab: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    tabText: {
        color: 'white',
        fontSize: 16,
    },
    activeTabText: {
        fontWeight: 'bold',
    },
    eventsList: {
        marginTop: 10,
    },
    eventItem: {
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventItemContent: {
        flex: 1,
    },
    eventName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    eventDate: {
        fontSize: 14,
        color: 'white',
    },
    eventActions: {
        flexDirection: 'row',
    },
    actionIcon: {
        marginLeft: 15,
    },
    noEventsText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
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
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    detailText: {
        fontSize: 16,
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
    },
    datePickerButton: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
    },
    datePickerText: {
        fontSize: 16,
    },
    sharedEventContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    sharedLabel: {
        fontSize: 16,
    },
    colorLabel: {
        fontSize: 16,
        marginBottom: 10,
    },
    colorPicker: {
        flexDirection: 'row',
        marginBottom: 15,
        paddingBottom: 15,
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
    },
    cancelButtonText: {
        color: '#007BFF',
        fontSize: 16,
        textAlign: 'center',
    },
    modalCancelButtonContainer: {
        backgroundColor: '#FF4500',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    modalCancelButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 20,
    },
    clearButton: {
        position: 'absolute',
        right: 10,
        top: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textArea: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        height: 100,
        textAlignVertical: 'top',
    },
    addEvent: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#007BFF',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    addEventText: {
        fontSize: 30,
        color: 'white',
    },
    colorPickerContainer: {
        marginBottom: 15,

    },
    mainContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    dayDate: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    emptyDayText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    todayIndicator: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginLeft: 10,
    },
    todayText: {
        color: 'white',
        fontSize: 12,
    },
    calendarContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
    },
    eventTimeLocation: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    searchInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 20,
        color: 'white',
        marginBottom: 20,
    },
    filterButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
    },
    filterButtonText: {
        color: 'white',
    },
    activeFilterButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    detailGrid: {
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
    },
    detailLabel: {
        flex: 1,
        fontWeight: 'bold',
    },
    detailValue: {
        flex: 2,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#007BFF',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    eventIndicator: {
        height: 8,
        width: 8,
        borderRadius: 4,
        marginRight: 5,
    },
    modalScroll: {
        maxHeight: '70%',
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    noEventsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    noEventsImage: {
        width: 100,
        height: 100,
        marginBottom: 20,
        opacity: 0.7,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeInput: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        width: '48%',
    },
    timeLabel: {
        fontSize: 16,
        marginBottom: 5,
    },
    errorText: {
        color: '#dc3545',
        marginBottom: 10,
    },
    colorPickerScrollView: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    additionalOptionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    additionalOptionsText: {
        color: '#007BFF',
        marginLeft: 5,
    },
    notificationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
    },
    notificationText: {
        marginLeft: 10,
    },
    repeatOptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    repeatOptionText: {
        fontSize: 16,
    },
    pickerContainer: {
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginBottom: 15,
    },
    dateTimePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
    },
    dateTimePickerText: {
        marginLeft: 10,
    },
    participantsContainer: {
        marginBottom: 15,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 15,
        marginRight: 10,
        marginBottom: 5,
    },
    participantName: {
        marginRight: 5,
    },
    addParticipantButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    addParticipantText: {
        color: '#007BFF',
        marginLeft: 5,
    },
    participantsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    locationContainer: {
        marginBottom: 15,
    },
    mapPreview: {
        height: 150,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPreviewText: {
        color: '#666',
    },
    calendarIcons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    calendarIcon: {
        marginLeft: 15,
    },

});
