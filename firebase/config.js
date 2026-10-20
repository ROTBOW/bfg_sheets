const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfigKeys = [
    "apiKey",
    "authDomain",
    "databaseURL",
    "projectId",
    "appId",
];

/**
 * Returns the browser-safe Firebase configuration after checking required values.
 *
 * @returns {object} The configuration passed to `initializeApp`.
 * @throws {Error} When a required public environment variable is missing.
 */
export const getFirebaseConfig = () => {
    const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

    if (missingKeys.length) {
        throw new Error(
            `Firebase configuration is incomplete. Missing: ${missingKeys.join(", ")}.`,
        );
    }

    return firebaseConfig;
};

/**
 * Reports whether browser Firebase clients should connect to local emulators.
 *
 * @returns {boolean} True only when the public emulator flag is exactly `true`.
 */
export const shouldUseFirebaseEmulators = () => (
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true"
);
