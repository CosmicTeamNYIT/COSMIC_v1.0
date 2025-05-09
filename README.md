![COSMIC Logo](https://github.com/CosmicTeamNYIT/COSMIC_v1.0/blob/main/assets/images/CosmicBanner.png)

# C.O.S.M.I.C 


## Calendar Organization System - Modular, Interactive, Connected

A mobile application built with React Native and Expo Go designed to help us organize schedules and events. It leverages Google Firebase for secure user authentication and a robust NoSQL database using Firestore to manage calendar data. It also integrates OpenRouteService for mapping and routing functionalities.

---

## Table of Contents 

- [Contributors](#contributors-)
- [User Guide](#user-guide)
- [Technology Stack](#technology-stack-)
- [Setup Guide](#setup-guide-)
    - [Development Environment Setup](#development-environment-setup)
    - [Firebase Project Setup](#firebase-project-setup)
    - [OpenRouteService API Key Setup](#openrouteservice-api-key-setup)
    - [Running the Project](#running-the-project)
    - [Production Setup](#production-setup)
- [Packages and APIs](#packages-and-apis-)

---

## Contributors 

Here is a list of the project contributors and their key contributions:

* **Shankalpa Duwadi**: [https://github.com/Shankalpa-D](https://github.com/Shankalpa-D)
    * Shawn played a key role in helping us envision how our app would look. He focused on our front end development, helping translate our Figma design to react native using various libraries and components. He also assisted with debugging and helping the team organize and prepare for our presentation.
* **Lewi Gao**: [https://github.com/lewigao](https://github.com/lewigao)
    * Lewi was mainly involved with our database implementation. He played a key role in debugging issues throughout development, and also helped with the implementation of our social feed logic; appropriately handling shared events on the back end.
* **Dean Husain**: [https://github.com/D34nTheB34n/](https://github.com/D34nTheB34n/)
    * Dean was the project leader. He ensured the project progressed smoothly throughout the semester, and kept track of our goals for the app we were developing and the status of its implementation. He served as both the co-designer for the front end (UI/UX), and assisted in helping Lewi with the back end, specifically connecting our app to firebase. Overall, he assisted in all parts of development and documentation, and helped our team get past the obstacles we encountered during development.
* **Keerthi Kapavarapu**: [https://github.com/keerthik-19](https://github.com/keerthik-19)
    * Keerthi worked on the back end logic for the GPS/Maps function of our app. She had assistance from Vincent while she handled the data from different parts of the app. She also played a large role in keeping track of how much we completed from the list of features we planned, and also helped document the progress of our development cycle.
* **Vincent Zhang**: [https://github.com/Vincent-zhangS](https://github.com/Vincent-zhangS)
    * Vincent also worked to help develop our backend. He assisted in the development of our routing system with Keerthi, and assisted Shawn in the design of our presentation and debugging.

---

## User Guide 

A detailed user guide for installing, setting up, and using the C.O.S.M.I.C app is available here:
https://github.com/CosmicTeamNYIT/COSMIC_v1.0/blob/main/Manual.pdf

---

## Technology Stack 🛠

This project is built using the following technologies:

* **Framework:** React Native
* **Development Tool:** Expo Go
* **Database & Backend:** Google Firebase (specifically Firestore and Authentication) 
* **Mapping & Routing:** OpenRouteService 
* **Programming Language:** TypeScript
* **Package Manager:** npm

**Hardware and Software Prerequisites:**

To set up and run this project, you should have the following software installed.

* **Operating System:** Windows 10+, macOS 10.14+, or modern Linux distributions.
* **Mobile Device:**
    * Android device for testing with Expo Go.
    * **Minimum Android OS version:** Android 7.0 - Nougat
* **Development Machine:**
    * **Recommended:** 8 GB RAM or more, modern multi-core processor, and at least 10 GB of free disk space.
* **Software:**
    * Node.js (Use the latest stable version)
    * npm (Use the latest stable version)
    * Expo CLI: Install globally using `npm install -g expo-cli` (Ensure you have the latest version)
    * Git
    * IDE (e.g., VS Code, Android Studio, InteliJ IDEA)
    * **Android Studio:** Required for building and signing the Android application package (APK) using Gradle.

---

## Setup Guide 

These instructions will get a development build of the app running on your local machine.

### Development Environment Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/CosmicTeamNYIT/COSMIC_v1.0.git
    cd COSMIC_v1.0
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Install Expo Go on your Android mobile device:**
    * Download from the Google Play Store: [https://play.google.com/store/apps/details?id=host.exp.exponent&pcampaignid=web_share](https://play.google.com/store/apps/details?id=host.exp.exponent&pcampaignid=web_share)

### Firebase Project Setup 

1.  **Create a Firebase Project:**
    * Go to the Firebase console: [https://console.firebase.google.com/](https://console.firebase.google.com/)
    * Click "Get started with a Firebase Project" and follow the on-screen instructions to create a new project.

2.  **Set up Firestore Database:**
    * The project utilizes a Firestore NoSQL database with primary collections `users` and `events`.
    * We manually created these collections in the Firestore Data tab within our Firebase console.
    * The `users` collection stores user profile information and includes a `friends` subcollection. Typical fields in a user document include `bio`, `createdAt`, `email`, `location`, `phone`, `socialHandle`, `updatedAt`, and `username`.
    * The `events` collection stores calendar event details (e.g., `name`, `date`, `startTime`, `endTime`, `location`, `description`, `color`, `isShared`, `userId`, `createdAt`). Event documents are typically identified by a unique ID generated by Firestore or the app.
    * **Applying the Schema:** Due to Firestore being a NoSQL database, traditional database creation and insertion scripts are not used. The database schema is implicitly defined by the data structures used in our application's code (e.g., when creating new user or event documents). You will need to manually create the `users` and `events` collections in the Firestore Data tab to get started.

3.  **Set up Firebase Authentication:**
    * In your Firebase project console, navigate to "Accelerate app development" -> "Authentication".
    * Follow the on-screen instructions for setup.
    * **Enable the Email/Password authentication method**, as this is implemented in our application's codebase for user registration and login.

4.  **Add Firebase Configuration to our project:**
    * In your Firebase project console, go to "Project settings" (the gear icon).
    * Under "Your apps", select the app you added for your React Native project, if you haven't added one, click "Add app" and select the Web "</>" platform.
    * Copy the Firebase configuration object.
    * Navigate to the `src/` directory in your project.
    * Create or open the file named `firebaseConfig.js`.
    * Paste the following code into this file and **replace the placeholder values** (`YOUR_API_KEY`, etc.) with the values from your Firebase project settings. Ensure the necessary Firebase service modules (`auth`, `db`, etc.) are imported and exported.

    ```javascript
    import { initializeApp } from "firebase/app";
    import { getFirestore } from "firebase/firestore";
    import { initializeAuth, getReactNativePersistence } from "firebase/auth";
    import AsyncStorage from "@react-native-async-storage/async-storage";

    // Replace with your keys and update .gitignore to ignore this file
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
    const db = getFirestore(app);

    export { app, auth, db };
    ```

### OpenRouteService API Key Setup 

1.  **Obtain an OpenRouteService API Key:**
    * Go to the OpenRouteService dashboard: [https://openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
    * Sign up for an account or log in.
    * Navigate to the API Key section and generate a new API key.

2.  **Add the API Key to our project:**
    * Navigate to the `src/` directory in your project.
    * Create a new file named `openRouteService.js`.
    * Inside `openRouteService.js`, add the following line, replacing `'YOUR_ID'` with your actual OpenRouteService API key:

    ```javascript
    //Replace with your key and update .gitignore to ignore this file
    export const ORS_API_KEY = 'YOUR_KEY';
    ```
    * Make sure to replace `'YOUR_KEY'` with the API key you obtained from the OpenRouteService dashboard.

### Running the Project 

1.  **Start the Expo development server:**
    * Make sure you are in the root directory of your project in the terminal.

    ```bash
    npx expo start
    ```
    * This command will start the development server and display a QR code in your terminal.

2.  **Handle Firestore Indexing:**
    * Firestore may require you to create indexes to ensure performance.
    * If a query requires an index that doesn't exist, the Expo development server **terminal will display a warning message that includes a clickable URL**.
    * **Click this URL** in your terminal. It will open a page in the Firebase console that is pre-configured to create the necessary index. Follow the prompts on the Firebase console page to easily create the index. Your application might not function correctly or queries may fail until the required indexes are created.

3.  **Open the app in Expo Go on your Android device:**
    * Open the Expo Go app on your Android mobile device.
    * Scan the QR code displayed in your computer's terminal using the "Scan QR Code" option in the Expo Go app.
    * The C.O.S.M.I.C app should load on your device.

### Production Setup 

To prepare the C.O.S.M.I.C app for distribution on Android, you need to generate the native Android project files and then build the release APK using Gradle.

1.  **Generate the Android project files:**
    Run the following command in your project's root directory to generate the native Android directory:
    ```bash
    npx expo prebuild
    ```
    This will create an `android` folder in your project.

2.  **Navigate into the Android directory:**
    Change your current directory to the newly created `android` folder:
    ```bash
    cd android
    ```

3.  **Build the release APK:**
    Execute the following Gradle command to build the release version of your application:
    ```bash
    ./gradlew assembleRelease
    ```
    This command will compile your code and resources and generate a signed release APK file.

Once the build is complete, you can find the generated APK file in `/android/app/build/outputs/apk/release/`.

---

## Packages and APIs 

These are the dependencies and APIs used in our app.

* **Core Development:**
    * `react` (v18.3.1): JavaScript library for building user interfaces.
    * `react-dom` (v18.3.1): Provides DOM-specific methods that can be used at the top level of a web app to enable efficient management of the DOM elements. (Included for web compatibility with Expo).
    * `react-native` (v0.76.8): The framework for building native mobile apps using React.
    * `typescript` (v5.3.3 - dev dependency): A typed superset of JavaScript that compiles to plain JavaScript. Used for adding static types to the project.
    * `expo` (~52.0.35): The core Expo package.
    * `expo-router` (~4.0.20): File-based routing for Expo and React Native.
    * `expo-constants` (~17.0.6): Provides access to the Expo app's constants and platform information.
    * `expo-splash-screen` (~0.29.22): Helps keep the splash screen visible while your app loads.
    * `expo-status-bar` (~2.0.1): Provides control over the device's status bar.
    * `expo-system-ui` (~4.0.9): Provides utilities for configuring system UI elements.
    * `expo-linking` (~7.0.5): Provides an interface to interact with incoming and outgoing links.
    * `@react-native-async-storage/async-storage` (^2.1.2): Persistent key-value storage for React Native.

* **UI and Styling:**
    * `@expo/vector-icons` (^14.0.2): Provides access to various icon sets commonly used in mobile apps.
    * `react-native-vector-icons` (^10.2.0): Another popular library for using vector icons in React Native.
    * `@rneui/themed` (^4.0.0-rc.8): A UI component library for React Native, providing themed and ready-to-use components.
    * `react-native-paper` (^5.13.1): A Material Design component library for React Native.
    * `expo-linear-gradient` (~14.0.2): Provides a gradient view component.
    * `expo-blur` (~14.0.3): Provides a blur view component.
    * `reanimated-color-picker` (^4.0.1): A color picker component built with React Native Reanimated.

* **Navigation:**
    * `@react-navigation/native` (^7.0.14): The core library for navigation in React Native.
    * `@react-navigation/bottom-tabs` (^7.2.0): Implements a tab bar at the bottom of the screen.
    * `@react-navigation/native-stack` (^7.3.3): Provides a way for our app to transition between screens where each new screen is placed on top of a stack.
    * `react-native-screens` (~4.4.0): Provides native primitives to represent screens in navigation containers.
    * `react-native-safe-area-context` ("4.12.0"): Provides utilities to handle safe areas, relevant for devices with notches or rounded corners.
    * `react-native-gesture-handler` (~2.20.2): Provides native-driven gesture management.
    * `react-native-reanimated` (~3.16.1): A powerful animation library for React Native.

* **Date, Time, and Calendar:**
    * `@react-native-community/datetimepicker` (^8.2.0): Native date and time picker component.
    * `react-native-date-picker` (^5.0.12): Another date picker component for React Native.
    * `react-native-modal-datetime-picker` (^18.0.0): A wrapper around native date/time pickers to display them as modals.
    * `react-native-calendars` (^1.1310.0): A flexible and customizable calendar component.

* **Location and Mapping:**
    * `expo-location` (~18.0.10): Provides access to the device's location services.
    * `react-native-maps` (^1.18.0): Provides customizable maps for React Native apps.
    * `geolib` (^3.3.4): A library to work with geographic coordinates.

* **Other Utilities and Components:**
    * `axios` (^1.8.4): A promise-based HTTP client for making requests.
    * `react-native-fs` (^2.20.0): Provides native file system access.
    * `react-native-swiper` (^1.6.0): A swiper component for building carousels or onboarding screens.
    * `react-native-web` (~0.19.13): Runs React Native components and APIs on the web.
    * `react-native-webview` ("13.12.5"): Provides a WebView component to display web content in our app.
    * `uuid` (^11.1.0): Generates unique identifiers.

* **Google Firebase** 
    * **Description:** Backend services provided by Google, used for authentication and a NoSQL database (Firestore) in our app.
    * **Reason for Choice:** We chose Firebase because it was the simplest to use with our team's area of expertise, and it offered a simple solution to handle both login and storing data without having to implement middleware, which could have delayed development.
    * **Firebase Services Used & API Interaction:**
        * **Authentication:**
            * **Description:** Manages secure user signup, login, and session management.
            * **API Interaction:** Interactions occur via the Firebase Authentication SDK (`firebase/auth`). This involves method calls like `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`, etc. These SDK methods handle the underlying communication with Firebase's authentication backend over secure channels. There are no traditional REST endpoints we directly interact with from the app code for these core auth flows.
            * **Request/Response Format:** The SDK methods handle the data exchange. User data (like email, password) is passed as function arguments. Responses typically return a `UserCredential` object upon successful authentication or registration, containing user information, or throw an error on failure.
        * **Firestore:**
            * **Description:** A NoSQL cloud database for storing and syncing data in real-time.
            * **Usage in Project:** Used to store and manage user accounts, calendar events, and friends.
            * **Key Collections and Structure:** The key Firestore collections in this project include:
                * `users`: Stores user profile information (e.g., `username`, `email`, `bio`, `location`, `phone`, `socialHandle`, `updatedAt`, and `username`). Each user document is identified by the Firebase Authentication User ID and contains a `friends` subcollection to manage connections.
                * `events`: Stores calendar event details (e.g., `name`, `date`, `startTime`, `endTime`, `location`, `description`, `color`, `isShared`, `userId`, `createdAt`). Event documents are typically identified by a unique ID generated by Firestore or the app.
            * **Data Modeling Approach:** Our data modeling approach in Firestore is based on collections for main entities (`users`, `events`) and using subcollections for related data (`friends` within a user document). Relationships between users and events are managed by storing the `userId` within the event document.
            * **Types of Queries Used:** We perform queries such as fetching a single user document by ID, querying events filtered by `userId` and `date`, querying shared events from friends by checking `userId` against a list of friend IDs and filtering by the `isShared` field, and fetching documents within the `friends` subcollection.

* **OpenRouteService** 
    * **Description:** A web service providing routing, geocoding, and other geospatial functionalities via REST APIs.
    * **Reason for Choice:** We chose OpenRouteService to help us accurately calculate distances and the time it takes to get from different areas.
    * **Usage in Project:** OpenRouteService is used in the Map screen to:
        * Provide autocomplete suggestions for locations as the user types.
        * Geocode user-entered addresses or event locations to obtain precise coordinates.
        * Calculate routes and estimate travel time and distance between a starting point and a destination using different travel modes (driving, walking).
    * **API Interaction:** Interactions are made by sending HTTP GET requests to specific OpenRouteService REST API endpoints using the `axios` library. The API key is included as a query parameter.
    * **Endpoints:** The specific OpenRouteService API endpoints used are:
        * `/geocode/autocomplete`: For location search suggestions.
        * `/geocode/search`: For converting addresses/place names to coordinates (geocoding).
        * `/v2/directions/{profile}`: For calculating routes, where `{profile}` is typically `driving-car` or `foot-walking`.
    * **Request/Response Format:** Requests are made via GET with parameters in the URL. Responses are returned in JSON format.
        * **Geocoding (Autocomplete and Search):**
            * **Request Example (Conceptual):** `GET https://api.openrouteservice.org/geocode/search?api_key=YOUR_KEY&text=address_or_place&point.lon=...&point.lat=...` (Similar parameters for autocomplete, with `geocode/autocomplete` endpoint and `focus.point` instead of `point`).
            * **Response (Key fields):** JSON containing a `features` array. Each feature object includes `properties` (with `label` as the name/address, `lat`, `lon` as coordinates) and `geometry` (with `coordinates` as `[longitude, latitude]`).
        * **Directions (Routing):**
            * **Request Example (Conceptual):** `GET https://api.openrouteservice.org/v2/directions/driving-car?api_key=YOUR_KEY&start=lon1,lat1&end=lon2,lat2&format=geojson&instructions=false`
            * **Response (Key fields):** JSON in GeoJSON format containing a `features` array. The first feature's `properties` include a `summary` object (with `duration` in seconds and `distance` in meters). The `geometry` object contains `coordinates`, an array of `[longitude, latitude]` pairs representing the route line.

---
# Thank You
We hope this readme was sufficient to help you build our app on your local machine, and provided you with information that help you better understand the in's and out's of C.O.S.M.I.C!
