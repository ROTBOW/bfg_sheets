"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirebaseServices } from "./client";

let authenticationPromise;

/**
 * Waits for Firebase Auth to restore the browser's persisted user, if one exists.
 *
 * @param {import("firebase/auth").Auth} auth Firebase Auth service to observe.
 * @returns {Promise<import("firebase/auth").User|null>} The restored user or null.
 */
const waitForInitialAuthState = (auth) => (
    new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                resolve(user);
            },
            reject,
        );
    })
);

/**
 * Returns the current Firebase user or signs the browser in anonymously.
 * Concurrent callers share one attempt; a failed attempt may be retried later.
 *
 * @returns {Promise<import("firebase/auth").User>} The authenticated browser user.
 */
export const ensureAnonymousUser = async () => {
    if (!authenticationPromise) {
        authenticationPromise = (async () => {
            const { auth } = getFirebaseServices();
            const existingUser = auth.currentUser || await waitForInitialAuthState(auth);

            if (existingUser) {
                return existingUser;
            }

            const credential = await signInAnonymously(auth);
            return credential.user;
        })().catch((error) => {
            authenticationPromise = undefined;
            throw error;
        });
    }

    return authenticationPromise;
};
