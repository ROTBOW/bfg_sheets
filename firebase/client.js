"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import { getFirebaseConfig, shouldUseFirebaseEmulators } from "./config";

let areEmulatorsConnected = false;

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
