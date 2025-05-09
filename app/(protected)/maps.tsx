import React, { useState, useRef, useEffect } from 'react';
import {
    Alert,
    StyleSheet,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    Platform,
    TextInput,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { ORS_API_KEY } from '@/src/openRouteService';
import { db, auth } from '@/src/firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const mapHeight = height * 0.3;
const controlsHeight = height * 0.7;

const travelModes = ['driving-car', 'foot-walking', 'public-transit'];
const travelModeLabels = ['Driving', 'Walking', 'Public Transit'];

const DEFAULT_LOCATION = {
    latitude: 40.7128,
    longitude: -74.0060,
    label: 'Default Location (e.g., New York City)'
};

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
    latitude?: number;
    longitude?: number;
}

interface SearchResultItem {
    type: 'place' | 'event';
    properties?: {
        label: string;
        lat?: number;
        lon?: number;
    };
    geometry?: {
        coordinates: [number, number];
    };
    id?: string;
    name?: string;
    location?: string;
    date?: string;
    latitude?: number;
    longitude?: number;
    userId?: string;
    username?: string;
}

interface GeocodeSearchResultItem {
    properties: {
        label: string;
        lat: number;
        lon: number;
    };
    geometry: {
        coordinates: [number, number];
    };
}

interface Destination {
    latitude: number;
    longitude: number;
    label: string;
}

interface LocationInput {
    latitude: number;
    longitude: number;
    label: string;
}

export default function MapScreen() {
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
    const [travelTime, setTravelTime] = useState<string | null>(null);
    const [travelDistance, setTravelDistance] = useState<string | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [selectedTravelMode, setSelectedTravelMode] = useState('driving-car');
    const [isEventsModalVisible, setIsEventsModalVisible] = useState(false);
    const [userEvents, setUserEvents] = useState<Event[]>([]);
    const [friendsPublicEvents, setFriendsPublicEvents] = useState<Event[]>([]);
    const [isSearchingAutocomplete, setIsSearchingAutocomplete] = useState(false);

    const [isGeocodeEventModalVisible, setIsGeocodeEventModalVisible] = useState(false);
    const [geocodeModalSearchText, setGeocodeModalSearchText] = useState('');
    const [geocodeModalSearchResults, setGeocodeModalSearchResults] = useState<GeocodeSearchResultItem[]>([]);
    const [isGeocodingModal, setIsGeocodingModal] = useState(false);
    const [selectedEventForGeocoding, setSelectedEventForGeocoding] = useState<Event | null>(null);

    const [activeTab, setActiveTab] = useState('myEvents');

    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);
    // State to store route calculation error message
    const [routeCalculationError, setRouteCalculationError] = useState<string | null>(null);

    // State for the new Start Location Modal
    const [isStartLocationModalVisible, setIsStartLocationModalVisible] = useState(false);
    const [startLocationModalSearchText, setStartLocationModalSearchText] = useState('');
    const [startLocationModalSearchResults, setStartLocationModalSearchResults] = useState<GeocodeSearchResultItem[]>([]);
    const [isSearchingStartLocationModal, setIsSearchingStartLocationModal] = useState(false);

    const [selectedStartLocation, setSelectedStartLocation] = useState<LocationInput | null>(null);

    const currentUserUid = auth.currentUser?.uid;

    const getUsernameById = async (userId: string): Promise<string> => {
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
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationPermissionGranted(true);
                try {
                    let location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;
                    setCurrentLocation({ latitude, longitude });
                    // Set initial selected start location to current location coordinates
                    setSelectedStartLocation({ latitude, longitude, label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                    setUsingDefaultLocation(false);
                } catch (locationError: any) {
                    console.error('Error getting current location:', locationError);
                    let userMessage = 'Could not get your current location.';
                     if (locationError.message.includes('unsatisfied device settings')) {
                        userMessage += ' Please check your device\'s location settings (e.g., GPS is on).';
                    } else {
                         userMessage += ' Using default location.';
                    }
                    setErrorMsg(userMessage);
                    setCurrentLocation(null);
                    setSelectedStartLocation(DEFAULT_LOCATION);
                    setUsingDefaultLocation(true);
                }
            } else {
                setErrorMsg('Permission to access location was denied. Using default location.');
                setLocationPermissionGranted(false);
                setCurrentLocation(null);
                setSelectedStartLocation(DEFAULT_LOCATION);
                setUsingDefaultLocation(true);
            }
        })();
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!currentUserUid) {
                setUserEvents([]);
                setFriendsPublicEvents([]);
                return;
            }

            try {
                const userEventsCollectionRef = collection(db, "events");
                const userEventsQuery = query(userEventsCollectionRef, where("userId", "==", currentUserUid));
                const userEventsSnapshot = await getDocs(userEventsQuery);
                const userEventsList = userEventsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data() as Event
                }));
                setUserEvents(userEventsList);

                const userFriendsRef = collection(db, "users", currentUserUid, "friends");
                const friendsSnapshot = await getDocs(userFriendsRef);
                const friendIds: string[] = [];

                friendsSnapshot.forEach((doc) => {
                    const friendData = doc.data();
                    if (friendData.userId) {
                        friendIds.push(friendData.userId);
                    }
                });

                let friendsEventsList: Event[] = [];
                if (friendIds.length > 0) {
                    const friendsEventsQuery = query(
                        collection(db, "events"),
                        where("userId", "in", friendIds),
                        where("isShared", "==", true)
                    );
                    const friendsEventsSnapshot = await getDocs(friendsEventsQuery);

                    const eventPromises = friendsEventsSnapshot.docs.map(async (doc) => {
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
                    friendsEventsList = resolvedEvents.filter(event => event !== null) as Event[];
                }
                setFriendsPublicEvents(friendsEventsList);

            } catch (error) {
                console.error("Error fetching events:", error);
            }
        };

        fetchEvents();
    }, [currentUserUid]);

    const handleTextInputChange = async (text: string) => {
        setSearchText(text);
        setSearchResults([]);

        if (!text) {
            return;
        }

        setIsSearchingAutocomplete(true);
        try {
            const focusPointLon = selectedStartLocation?.longitude || DEFAULT_LOCATION.longitude;
            const focusPointLat = selectedStartLocation?.latitude || DEFAULT_LOCATION.latitude;

            const placesResponse = await axios.get(
                `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${text}&focus.point.lon=${focusPointLon}&focus.point.lat=${focusPointLat}`
            );
            let placesResults: SearchResultItem[] = [];
            if (placesResponse.data.features) {
                placesResults = placesResponse.data.features.map((feature: any) => ({
                    ...feature,
                    type: 'place',
                }));
            }

            const allEvents = [...userEvents, ...friendsPublicEvents];
            const eventResults: SearchResultItem[] = allEvents
                .filter(event =>
                    (event.location && event.location.toLowerCase().includes(text.toLowerCase())) ||
                    (event.name && event.name.toLowerCase().includes(text.toLowerCase()))
                )
                .map(event => ({
                    ...event,
                    type: 'event',
                    latitude: event.latitude || 0,
                    longitude: event.longitude || 0,
                    userId: event.userId,
                    username: event.username,
                }));

            setSearchResults([...placesResults, ...eventResults]);

        } catch (error) {
            console.error('Error during autocomplete:', error);
            setSearchResults([]);
            setErrorMsg('Error searching for locations.');
        } finally {
            setIsSearchingAutocomplete(false);
        }
    };

    const handleSelectSearchResult = (item: SearchResultItem) => {
        setSearchText(item.type === 'place' ? item.properties?.label || '' : item.location || item.name || ''); // Set text input value
        setSearchResults([]); // Clear search results

        const label = item.type === 'place' ? item.properties?.label : item.location || item.name || 'Selected Location';

        if (item.type === 'place' && item.geometry) {
            const [longitude, latitude] = item.geometry.coordinates;
            setSelectedDestination({ latitude, longitude, label: label || '' });
        } else if (item.type === 'event') {
            if (item.latitude != null && item.longitude != null && (item.latitude !== 0 || item.longitude !== 0)) {
                setSelectedDestination({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    label: label || '',
                });
                Alert.alert("Event Location Used", `Route calculating to saved coordinates for "${item.name}".`);
            } else {
                setSelectedEventForGeocoding(item as Event);
                setSelectedDestination(null);
                setRouteCoordinates([]);
                setTravelTime(null);
                setTravelDistance(null);
                const eventLocation = item.location || item.name || '';
                setGeocodeModalSearchText(eventLocation);
                setGeocodeModalSearchResults([]);
                setIsGeocodeEventModalVisible(true);
                if (eventLocation.length > 0) {
                    setTimeout(() => performGeocodeSearchInModal(eventLocation), 100);
                }
            }

            if(isEventsModalVisible) {
                setIsEventsModalVisible(false);
            }
        }
    };

    const handleGeocodeModalTextInputChange = (text: string) => {
        setGeocodeModalSearchText(text);
        setGeocodeModalSearchResults([]);
    };

    const performGeocodeSearchInModal = async (textToSearch: string) => {
        if (!textToSearch) {
            setGeocodeModalSearchResults([]);
            return;
        }

        setIsGeocodingModal(true);
        setGeocodeModalSearchResults([]);

        try {
            const focusPointLon = selectedStartLocation?.longitude || DEFAULT_LOCATION.longitude;
            const focusPointLat = selectedStartLocation?.latitude || DEFAULT_LOCATION.latitude;

            const response = await axios.get(
                `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${textToSearch}&point.lon=${focusPointLon}&point.lat=${focusPointLat}`
            );

            if (response.data.features && response.data.features.length > 0) {
                const resultsWithCoords = response.data.features.filter((feature: any) => feature.geometry?.coordinates)
                setGeocodeModalSearchResults(resultsWithCoords as GeocodeSearchResultItem[]);
            } else {
                setGeocodeModalSearchResults([]);
            }

        } catch (error) {
            console.error('Error during geocoding search in modal:', error);
            setGeocodeModalSearchResults([]);
        } finally {
            setIsGeocodingModal(false);
        }
    };

    const handleSelectGeocodeResult = (item: GeocodeSearchResultItem) => {
        const [longitude, latitude] = item.geometry.coordinates;
        const label = item.properties.label;

        setSelectedDestination({ latitude, longitude, label });

        setIsGeocodeEventModalVisible(false);
        setGeocodeModalSearchText('');
        setGeocodeModalSearchResults([]);
        setSelectedEventForGeocoding(null);

        setSearchText(label);
    };

    // New functions for Start Location Modal
    const handleStartLocationModalInputChange = async (text: string) => {
        setStartLocationModalSearchText(text);
        setStartLocationModalSearchResults([]);

        if (!text) {
            return;
        }

        setIsSearchingStartLocationModal(true);
        try {
            // Use current location as focus point if available, otherwise default
            const focusPointLon = currentLocation?.longitude || DEFAULT_LOCATION.longitude;
            const focusPointLat = currentLocation?.latitude || DEFAULT_LOCATION.latitude;

            const response = await axios.get(
                `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${text}&focus.point.lon=${focusPointLon}&focus.point.lat=${focusPointLat}`
            );

            if (response.data.features) {
                setStartLocationModalSearchResults(response.data.features.map((feature: any) => ({
                    properties: {
                        label: feature.properties.label,
                        lat: feature.geometry.coordinates[1],
                        lon: feature.geometry.coordinates[0],
                    },
                    geometry: feature.geometry,
                })) as GeocodeSearchResultItem[]);
            } else {
                setStartLocationModalSearchResults([]);
            }

        } catch (error) {
            console.error('Error during start location modal autocomplete:', error);
            setStartLocationModalSearchResults([]);
        } finally {
            setIsSearchingStartLocationModal(false);
        }
    };

    const handleSelectStartLocationFromModal = (item: GeocodeSearchResultItem) => {
        const [longitude, latitude] = item.geometry.coordinates;
        const label = item.properties.label;
        setSelectedStartLocation({ latitude, longitude, label });
        setIsStartLocationModalVisible(false); // Close modal
        setStartLocationModalSearchText(''); // Clear search text
        setStartLocationModalSearchResults([]); // Clear results
    };


    const handleGrabMyCurrentLocation = async () => {
        setIsCalculatingRoute(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationPermissionGranted(true);

                let location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                setCurrentLocation({ latitude, longitude });
                // Update selectedStartLocation label with coordinates
                setSelectedStartLocation({ latitude, longitude, label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                setUsingDefaultLocation(false);
                setErrorMsg(null); // Clear any previous location error
            } else {
                 setErrorMsg('Permission to access location was denied. Cannot grab your current location.');
                setLocationPermissionGranted(false);
                setCurrentLocation(null);
                setSelectedStartLocation(DEFAULT_LOCATION);
                setUsingDefaultLocation(true);
            }
        } catch (locationError: any) {
            console.error('Error getting current location:', locationError);
             let userMessage = 'Could not get your current location.';
             if (locationError.message.includes('unsatisfied device settings')) {
                userMessage += ' Please check your device\'s location settings (e.g., GPS is on).';
            } else {
                 userMessage += ' Please select a location manually.';
            }
            setErrorMsg(userMessage);
            setCurrentLocation(null);
            setSelectedStartLocation(DEFAULT_LOCATION);
            setUsingDefaultLocation(true);
        } finally {
             setIsCalculatingRoute(false); // Stop loading indicator
        }
    };


    useEffect(() => {
        if (selectedDestination && (selectedDestination.latitude !== 0 || selectedDestination.longitude !== 0)) {
            const startLocation = selectedStartLocation || currentLocation || DEFAULT_LOCATION;
            calculateRoute(selectedDestination, selectedTravelMode, startLocation);
        } else {
            // Clear route info when destination is cleared
            setRouteCoordinates([]);
            setTravelTime(null);
            setTravelDistance(null);
            setRouteCalculationError(null);
        }
    }, [selectedStartLocation, selectedDestination, selectedTravelMode]);

    const calculateRoute = async (destination: Destination, mode: string, startLocation: { latitude: number; longitude: number } | null) => {
        // More explicit check for valid coordinates
        if (!destination || !startLocation || destination.latitude == null || destination.longitude == null || startLocation.latitude == null || startLocation.longitude == null) {
            console.warn("calculateRoute called without valid destination or start location coordinates.");
            setTravelTime(null);
            setTravelDistance(null);
            setRouteCoordinates([]);
            setRouteCalculationError("Invalid destination or start location coordinates.");
            return;
        }

        setIsCalculatingRoute(true);
        setRouteCalculationError(null);

        try {
            const response = await axios.get(
                `https://api.openrouteservice.org/v2/directions/${mode}`,
                {
                    params: {
                        api_key: ORS_API_KEY,
                        start: `${startLocation.longitude},${startLocation.latitude}`,
                        end: `${destination.longitude},${destination.latitude}`,
                        format: 'geojson',
                        instructions: false,
                    },
                }
            );
            if (response.data.features && response.data.features.length > 0) {
                const routeFeature = response.data.features[0];
                const durationSeconds = routeFeature.properties.summary.duration;
                const durationMinutes = (durationSeconds / 60).toFixed(0);
                setTravelTime(durationMinutes);

                const distanceMeters = routeFeature.properties.summary.distance;
                const distanceMiles = (distanceMeters * 0.000621371).toFixed(1);
                setTravelDistance(distanceMiles);

                const coordinates = routeFeature.geometry.coordinates;
                const transformedCoordinates = coordinates.map((coord: [number, number]) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                }));
                setRouteCoordinates(transformedCoordinates);
                setRouteCalculationError(null);

            } else {
                setTravelTime(null);
                setTravelDistance(null);
                setRouteCoordinates([]);
                console.warn('Could not get route for the destination.');
                setRouteCalculationError(`Could not find a route for mode "${mode}".`);
            }
        } catch (error: any) {
            console.error('Error fetching route:', error);
            setTravelTime(null);
            setTravelDistance(null);
            setRouteCoordinates([]);
            let errorMessage = 'Error calculating route.';
            if (axios.isAxiosError(error)) {
                 if (error.response?.data?.error?.message) {
                    errorMessage = `API Error: ${error.response.data.error.message}`;
                } else if (error.response?.status) {
                     errorMessage = `The Open Route Service Server isn't responding to our API request. Request failed with status code ${error.response.status}`;
                } else if (error.request) {
                     errorMessage = `Request Error: No response received from server.`;
                } else {
                    errorMessage = `Request Setup Error: ${error.message}`;
                }
            } else {
                 errorMessage = `An unknown error occurred during route calculation: ${error.message}`;
            }
            setRouteCalculationError(errorMessage);

        } finally {
            setIsCalculatingRoute(false);
        }
    };

    const renderSearchResultDetails = (item: SearchResultItem) => {
        if (item.type === 'event' && (item.name || item.date)) {
            const date = typeof item.date === 'string' ? item.date : moment((item.date as any)?.toDate()).format('YYYY-MM-DD');
            return (
                <Text style={styles.searchResultItemDetails}>
                    {item.name && date ? `${item.name} - ${date}` : item.name || date}
                </Text>
            );
        }
        return null;
    };

    const renderSearchResultGeocodingWarning = (item: SearchResultItem) => {
        if (item.type === 'event' && (item.latitude === 0 && item.longitude === 0)) {
            return (
                <Text style={styles.searchResultItemWarning}>Geocoding needed</Text>
            );
        }
        return null;
    };

    const renderSearchResultItem = ({ item }: { item: SearchResultItem }) => (
        <TouchableOpacity style={styles.searchResultItem} onPress={() => handleSelectSearchResult(item)}>
            <Text style={styles.searchResultItemText}>
                {item.type === 'place' ? item.properties?.label : item.location || item.name}
            </Text>
            {renderSearchResultDetails(item)}
            {renderSearchResultGeocodingWarning(item)}
        </TouchableOpacity>
    );

    const renderEventItemDetails = (item: Event) => {
        const date = typeof item.date === 'string' ? item.date : moment((item.date as any)?.toDate()).format('YYYY-MM-DD');
        if (item.location) {
            return <Text style={styles.eventItemDetails}>{date} at {item.location}</Text>;
        } else if (date) {
            return <Text style={styles.eventItemDetails}>{date} (No location specified)</Text>;
        }
        return null;
    };

    const renderEventItemWarning = (item: Event) => {
        if (item.latitude === 0 && item.longitude === 0) {
            return <Text style={styles.eventItemWarning}>Geocoding needed</Text>;
        }
        return null;
    };

    const renderEventItemUser = (item: Event) => {
        if (item.userId !== currentUserUid && item.username) {
            return <Text style={styles.eventItemUser}>Shared by: {item.username}</Text>;
        }
        return null;
    };

    const renderEventItem = ({ item }: { item: Event }) => (
        <TouchableOpacity style={styles.eventItem} onPress={() => handleSelectSearchResult({...item, type: 'event'})}>
            <Text style={styles.eventItemText}>{item.name}</Text>
            {renderEventItemDetails(item)}
            {renderEventItemWarning(item)}
            {renderEventItemUser(item)}
        </TouchableOpacity>
    );

    const renderGeocodeModalSearchResultItem = ({ item }: { item: GeocodeSearchResultItem }) => (
        <TouchableOpacity style={styles.modalSearchResultItem} onPress={() => handleSelectGeocodeResult(item)}>
            <Text style={styles.modalSearchResultItemText}>{item.properties.label}</Text>
        </TouchableOpacity>
    );

    // Render item for the new Start Location Modal search results
    const renderStartLocationModalResultItem = ({ item }: { item: GeocodeSearchResultItem }) => (
        <TouchableOpacity style={styles.modalSearchResultItem} onPress={() => handleSelectStartLocationFromModal(item)}>
            <Text style={styles.modalSearchResultItemText}>{item.properties.label}</Text>
        </TouchableOpacity>
    );


    const handleTravelModeChange = (mode: string) => {
        if (mode === 'public-transit') {
            Alert.alert(
                'Work in Progress',
                'Public Transit functionality is not yet implemented and requires different data/APIs.',
                [
                    { text: 'OK', onPress: () => {} },
                ],
                { cancelable: false }
            );
        } else {
            const startLocation = selectedStartLocation || currentLocation || DEFAULT_LOCATION;
            setSelectedTravelMode(mode);
            if(selectedDestination && (selectedDestination.latitude !== 0 || selectedDestination.longitude !== 0)){
                calculateRoute(selectedDestination, mode, startLocation);
            }
        }
    };

    useEffect(() => {
        if (errorMsg) {
            const timer = setTimeout(() => {
                setErrorMsg(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg]);

    // Route information section is shown only when a destination is selected
    const showRouteInfoSection = selectedDestination !== null;


    return (
        <View style={styles.fullScreen}>
            {errorMsg && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            <View style={[styles.map, { height: mapHeight, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                 <Text style={styles.mapUnavailableText}>
                    Map GUI not available due to the lack of a paid Google Maps API Key. Please view the presentation video to see a live demo of this function. However, feel free to use the distance and time functionality below!
                 </Text>
            </View>

            <View style={[styles.controlsContainer, { height: controlsHeight }]}>
                <ScrollView contentContainerStyle={styles.controlsScrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.contentWrapper}>
                        <View style={styles.searchSection}>
                            <Text style={styles.sectionTitle}>Starting Location</Text>
                            {/* Clickable text/button for starting location */}
                            <TouchableOpacity
                                style={[
                                    styles.startLocationDisplay,
                                    !selectedStartLocation && { opacity: 0.6 }
                                ]}
                                onPress={() => setIsStartLocationModalVisible(true)}
                            >
                                <Text style={styles.startLocationDisplayText}>
                                     {selectedStartLocation?.label || 'Select Starting Location'}
                                </Text>
                                <Feather name="edit-3" size={16} color="#555" />
                            </TouchableOpacity>

                        </View>

                        <View style={styles.searchSection}>
                             <Text style={styles.sectionTitle}>Destination</Text>
                            <View style={styles.searchInputContainer}>
                                <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Enter destination or event"
                                    placeholderTextColor="#888"
                                    value={searchText}
                                    onChangeText={handleTextInputChange}
                                    returnKeyType="done"
                                />
                                {isSearchingAutocomplete && <ActivityIndicator size="small" color="#888" style={styles.searchLoading} />}
                                {searchText.length > 0 && !isSearchingAutocomplete && (
                                    <TouchableOpacity onPress={() => {
                                        setSearchText('');
                                        setSearchResults([]);
                                        setSelectedDestination(null);
                                    }} style={styles.clearSearchButton}>
                                        <Feather name="x-circle" size={20} color="#888" />
                                    </TouchableOpacity>
                                )}
                            </View>

                        </View>

                        <View style={styles.travelModeContainer}>
                            <Text style={styles.sectionTitle}>Travel Mode</Text>
                            <View style={styles.travelModeButtons}>
                                {travelModes.map((mode, index) => (
                                    <TouchableOpacity
                                        key={mode}
                                        style={[
                                            styles.travelModeButton,
                                            selectedTravelMode === mode && styles.selectedTravelModeButton,
                                        ]}
                                        onPress={() => handleTravelModeChange(mode)}
                                    >
                                        <Text style={[styles.travelModeButtonText, selectedTravelMode === mode && styles.selectedTravelModeButtonText,]}>
                                            {travelModeLabels[index]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Route Information Section - Conditionally rendered */}
                        <View style={styles.travelInfoContainer}>
                            <Text style={styles.sectionTitle}>Route Information</Text>
                            {showRouteInfoSection ? (
                                isCalculatingRoute ? (
                                    <ActivityIndicator size="small" color="#2f80ed" />
                                ) : routeCalculationError ? (
                                     <Text style={[styles.errorText, styles.routeErrorText]}>{routeCalculationError}</Text> /
                                ) : travelTime !== null && travelDistance !== null ? (
                                    <>
                                        <Text style={styles.travelInfoText}>
                                            <Feather name="clock" size={16} color="#333" /> Approx Time: {travelTime} min
                                        </Text>
                                        <Text style={styles.travelInfoText}>
                                            <Feather name="map-pin" size={16} color="#333" /> Distance: {travelDistance} miles
                                        </Text>
                                        <Text style={styles.travelInfoText}>
                                            <Feather name="flag" size={16} color="#333" /> Destination: {selectedDestination?.label}
                                        </Text>
                                        {usingDefaultLocation && (
                                            <Text style={styles.defaultLocationWarning}>
                                                * Route calculated from a default location as current location is unavailable.
                                            </Text>
                                        )}
                                         {selectedStartLocation && selectedStartLocation.label !== 'Your Current Location' && !usingDefaultLocation && (
                                            <Text style={styles.defaultLocationWarning}>
                                                * Route calculated from: {selectedStartLocation.label}
                                            </Text>
                                        )}
                                    </>
                                ) : (

                                    <Text style={styles.travelInfoText}>Calculating route...</Text>
                                )
                            ) : (
                                // Message displayed when no destination is selected
                                <Text style={styles.travelInfoText}>
                                    Please enter a destination manually above or select an event from the "Events" button below to see route information.
                                </Text>
                            )}
                        </View>

                    </View>

                    <TouchableOpacity style={styles.eventsButton} onPress={() => setIsEventsModalVisible(true)}>
                        <Feather name="calendar" size={20} color="white" style={{ marginRight: 5 }} />
                        <Text style={styles.eventsButtonText}>Events</Text>
                    </TouchableOpacity>

                </ScrollView>

                {/* Destination Search Results FlatList - Rendered outside ScrollView */}

                {searchResults.length > 0 && searchText.length > 0 && (
                    <View style={[styles.searchResultsContainerAbsolute, { top: Platform.OS === 'ios' ? 160 : 140 }]}>
                         <FlatList
                            data={searchResults}
                            renderItem={renderSearchResultItem}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : `search_${index}`}
                            keyboardShouldPersistTaps="handled"
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            showsVerticalScrollIndicator={true}
                        />
                    </View>
                )}
            </View>

            {/* Events Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isEventsModalVisible}
                onRequestClose={() => setIsEventsModalVisible(false)}
            >
                 {/* KeyboardAvoidingView to adjust for keyboard */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Events</Text>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'myEvents' && styles.activeTab]}
                                onPress={() => setActiveTab('myEvents')}
                            >
                                <Text style={[styles.tabButtonText, activeTab === 'myEvents' && styles.activeTabText]}>My Events</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'friendsEvents' && styles.activeTab]}
                                onPress={() => setActiveTab('friendsEvents')}
                            >
                                <Text style={[styles.tabButtonText, activeTab === 'friendsEvents' && styles.activeTabText]}>Friends' Public Events</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'myEvents' ? (
                            userEvents.length > 0 ? (
                                <FlatList
                                    data={userEvents}
                                    renderItem={renderEventItem}
                                    keyExtractor={(item) => item.id.toString()}
                                    showsVerticalScrollIndicator={true}
                                    ItemSeparatorComponent={() => <View style={[styles.separator, styles.modalSeparator]} />}
                                />
                            ) : (
                                <Text style={styles.modalText}>No events found for your account.</Text>
                            )
                        ) : (
                            friendsPublicEvents.length > 0 ? (
                                <FlatList
                                    data={friendsPublicEvents}
                                    renderItem={renderEventItem}
                                    keyExtractor={(item) => item.id.toString()}
                                    showsVerticalScrollIndicator={true}
                                    ItemSeparatorComponent={() => <View style={[styles.separator, styles.modalSeparator]} />}
                                />
                            ) : (
                                <Text style={styles.modalText}>No public events found from your friends.</Text>
                            )
                        )}

                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsEventsModalVisible(false)}>
                            <Text style={styles.closeModalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                 </KeyboardAvoidingView>
            </Modal>

            {/* Geocode Event Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isGeocodeEventModalVisible}
                onRequestClose={() => setIsGeocodeEventModalVisible(false)}
            >
                 {/* KeyboardAvoidingView to adjust for keyboard */}
                 <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Find Event Location</Text>
                        <Text style={styles.modalSubtitle}>
                            {`"${selectedEventForGeocoding?.name || 'Event'}"`}
                        </Text>

                        <View style={styles.modalSearchInputRow}>
                            <View style={styles.modalSearchInputContainer}>
                                <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.modalSearchInput}
                                    placeholder="Search address for event"
                                    placeholderTextColor="#888"
                                    value={geocodeModalSearchText}
                                    onChangeText={handleGeocodeModalTextInputChange}
                                    returnKeyType="search"
                                    onSubmitEditing={() => performGeocodeSearchInModal(geocodeModalSearchText)}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.modalGeocodeSearchButton}
                                onPress={() => performGeocodeSearchInModal(geocodeModalSearchText)}
                                disabled={isGeocodingModal || !geocodeModalSearchText}
                            >
                                {isGeocodingModal ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Feather name="arrow-right" size={24} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {geocodeModalSearchResults.length > 0 ? (
                            <FlatList
                                data={geocodeModalSearchResults}
                                renderItem={renderGeocodeModalSearchResultItem}
                                keyExtractor={(item, index) => item.properties.label + index}
                                showsVerticalScrollIndicator={true}
                                ItemSeparatorComponent={() => <View style={[styles.separator, styles.modalSeparator]} />}
                                style={styles.modalSearchResultsList}
                            />
                        ) : geocodeModalSearchText.length > 0 && !isGeocodingModal ? (
                            <Text style={styles.modalText}>No locations found for "{geocodeModalSearchText}".</Text>
                        ) : null
                        }

                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsGeocodeEventModalVisible(false)}>
                            <Text style={styles.closeModalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                 </KeyboardAvoidingView>
            </Modal>

            {/* New Start Location Search Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isStartLocationModalVisible}
                onRequestClose={() => setIsStartLocationModalVisible(false)}
            >
                 {/* KeyboardAvoidingView to adjust for keyboard */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Select Starting Location</Text>

                        <View style={styles.modalSearchInputRow}>
                            <View style={styles.modalSearchInputContainer}>
                                <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.modalSearchInput}
                                    placeholder="Search for a location"
                                    placeholderTextColor="#888"
                                    value={startLocationModalSearchText}
                                    onChangeText={handleStartLocationModalInputChange}
                                    returnKeyType="search"
                                    onSubmitEditing={() => handleStartLocationModalInputChange(startLocationModalSearchText)} // Trigger search on submit
                                />
                                {isSearchingStartLocationModal && <ActivityIndicator size="small" color="#888" style={styles.searchLoading} />}
                                {startLocationModalSearchText.length > 0 && !isSearchingStartLocationModal && (
                                     <TouchableOpacity onPress={() => setStartLocationModalSearchText('')} style={styles.clearSearchButton}>
                                        <Feather name="x-circle" size={20} color="#888" />
                                    </TouchableOpacity>
                                )}
                            </View>

                        </View>

                        <TouchableOpacity
                            style={styles.grabLocationButtonModal}
                            onPress={() => {
                                handleGrabMyCurrentLocation();
                                setIsStartLocationModalVisible(false); // Close modal
                            }}
                            disabled={isCalculatingRoute} // Disable while getting location
                        >
                            {isCalculatingRoute ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Feather name="crosshair" size={20} color="white" style={{ marginRight: 5 }} />
                            )}
                            <Text style={styles.grabLocationButtonText}>Use My Current Location</Text>
                        </TouchableOpacity>


                        {startLocationModalSearchResults.length > 0 ? (
                            <FlatList
                                data={startLocationModalSearchResults}
                                renderItem={renderStartLocationModalResultItem}
                                keyExtractor={(item, index) => item.properties.label + index}
                                showsVerticalScrollIndicator={true}
                                ItemSeparatorComponent={() => <View style={[styles.separator, styles.modalSeparator]} />}
                                style={styles.modalSearchResultsList}
                            />
                        ) : startLocationModalSearchText.length > 0 && !isSearchingStartLocationModal ? (
                            <Text style={styles.modalText}>No locations found for "{startLocationModalSearchText}".</Text>
                        ) : null
                        }

                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsStartLocationModalVisible(false)}>
                            <Text style={styles.closeModalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    map: {
        width: '100%',
    },
    mapUnavailableText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    controlsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,

        zIndex: 10,
    },
    controlsScrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    contentWrapper: {
        flex: 1,
    },
    searchSection: {
        marginBottom: 15,

    },

    startLocationDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        minHeight: 44,
        justifyContent: 'space-between',
    },
    startLocationDisplayText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginRight: 10,
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
    },
    searchLoading: {
        marginLeft: 10,
    },
    clearSearchButton: {
        marginLeft: 10,
        padding: 5,
    },

    searchResultsContainerAbsolute: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 10,

        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
        overflow: 'hidden',
        zIndex: 11,
    },
    searchResultItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    searchResultItemText: {
        fontSize: 16,
        color: '#333',
    },
    searchResultItemDetails: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    searchResultItemWarning: {
        fontSize: 13,
        color: '#dc3545',
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 15,
    },
    modalSeparator: {
        marginHorizontal: 0,
    },
    travelModeContainer: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    travelModeButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        padding: 4,
    },
    travelModeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    selectedTravelModeButton: {
        backgroundColor: '#2f80ed',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    travelModeButtonText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '500',
    },
    selectedTravelModeButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    travelInfoContainer: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    travelInfoText: {
        fontSize: 15,
        color: '#333',
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    defaultLocationWarning: {
        fontSize: 13,
        color: '#dc3545',
        marginTop: 5,
        fontStyle: 'italic',
    },
    errorBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        right: 20,
        backgroundColor: '#dc3545',
        padding: 10,
        borderRadius: 8,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
    },

    routeErrorText: {
        color: '#000',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 5,
    },
    eventsButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    eventsButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        width: '85%',
        maxHeight: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 10,
        textAlign: 'center',
        color: '#555',
    },
    modalText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        paddingVertical: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007bff',
    },
    tabButtonText: {
        fontSize: 16,
        color: '#555',
    },
    activeTabText: {
        color: '#007bff',
        fontWeight: '600',
    },
    eventItem: {
        paddingVertical: 12,
    },
    eventItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    eventItemDetails: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    eventItemUser: {
        fontSize: 13,
        color: '#007bff',
        marginTop: 2,
    },
    eventItemWarning: {
        fontSize: 13,
        color: '#dc3545',
        marginTop: 2,
    },
    closeModalButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    closeModalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalSearchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalSearchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        marginRight: 8,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
    },
    modalGeocodeSearchButton: {
        backgroundColor: '#2f80ed',
        padding: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44,
    },
    modalSearchResultsList: {
        maxHeight: 150,
        marginBottom: 15,
    },
    modalSearchResultItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    modalSearchResultItemText: {
        fontSize: 16,
        color: '#333',
    },

     grabLocationButtonModal: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        marginBottom: 15,
    },
    grabLocationButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
