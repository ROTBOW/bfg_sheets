"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirebaseServices } from "./client";

let authenticationPromise;

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
