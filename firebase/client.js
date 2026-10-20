"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import { getFirebaseConfig, shouldUseFirebaseEmulators } from "./config";

let areEmulatorsConnected = false;

/**
 * Returns the shared Firebase app, anonymous-auth service, and realtime database.
 * Connects each service to its local emulator once when emulator mode is enabled.
 *
 * @returns {{ app: import("firebase/app").FirebaseApp, auth: import("firebase/auth").Auth, database: import("firebase/database").Database }}
 * @throws {Error} When required Firebase configuration is missing.
 */
export const getFirebaseServices = () => {
    const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
    const auth = getAuth(app);
    const database = getDatabase(app);

    if (shouldUseFirebaseEmulators() && !areEmulatorsConnected) {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectDatabaseEmulator(database, "127.0.0.1", 9000);
        areEmulatorsConnected = true;
    }

    return { app, auth, database };
};
