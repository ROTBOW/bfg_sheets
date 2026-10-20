"use client";

import {
    get,
    onDisconnect,
    onValue,
    ref,
    remove,
    serverTimestamp,
    set,
    update,
} from "firebase/database";
import { ensureAnonymousUser } from "./auth";
import { getFirebaseServices } from "./client";
import { createRoomId, normalizeDisplayName } from "./room-schema.mjs";

const connectionTestLifetimeMs = 24 * 60 * 60 * 1000;

/**
 * Returns the database path for an isolated two-machine connection test.
 *
 * @param {string} roomId Secure room identifier.
 * @returns {string} Realtime Database path for the test room.
 */
const connectionTestPath = (roomId) => `connectionTests/${roomId}`;

/**
 * Registers live presence and a server-side disconnect update for one participant.
 *
 * @param {string} roomId Test room containing the participant.
 * @param {string} uid Authenticated participant UID.
 * @returns {Promise<void>} Resolves after the disconnect hooks and online state are stored.
 */
const registerConnectionTestPresence = async (roomId, uid) => {
    const { database } = getFirebaseServices();
    const participantPath = `${connectionTestPath(roomId)}/participants/${uid}`;
    const connectedReference = ref(database, `${participantPath}/connected`);
    const lastSeenReference = ref(database, `${participantPath}/lastSeenAt`);

    await onDisconnect(connectedReference).set(false);
    await onDisconnect(lastSeenReference).set(serverTimestamp());
    await update(ref(database, participantPath), {
        connected: true,
        lastSeenAt: serverTimestamp(),
    });
};

/**
 * Creates a temporary two-participant room and signs the host in anonymously.
 *
 * @param {string} displayName Public name shown to the other test participant.
 * @returns {Promise<{ roomId: string, user: import("firebase/auth").User }>} New room identity.
 */
export const createConnectionTest = async (displayName) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomId = createRoomId();
    const timestamp = serverTimestamp();
    const room = {
        hostUid: user.uid,
        createdAt: timestamp,
        expiresAt: Date.now() + connectionTestLifetimeMs,
        participants: {
            [user.uid]: {
                displayName: normalizeDisplayName(displayName),
                role: "host",
                connected: true,
                joinedAt: timestamp,
                lastSeenAt: timestamp,
            },
        },
    };

    await set(ref(database, connectionTestPath(roomId)), room);
    await registerConnectionTestPresence(roomId, user.uid);

    return { roomId, user };
};

/**
 * Adds the current anonymous user to an available test room.
 *
 * @param {string} roomId Room identifier supplied by the host.
 * @param {string} displayName Public name shown to the host.
 * @returns {Promise<{ roomId: string, user: import("firebase/auth").User }>} Joined room identity.
 * @throws {Error} When the room is missing, expired, or already has two participants.
 */
export const joinConnectionTest = async (roomId, displayName) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomReference = ref(database, connectionTestPath(roomId));
    const snapshot = await get(roomReference);

    if (!snapshot.exists()) {
        throw new Error("Connection test not found. Check the room ID and try again.");
    }

    const room = snapshot.val();
    const participants = room.participants || {};

    if (room.expiresAt <= Date.now()) {
        throw new Error("This connection test has expired.");
    }

    if (!participants[user.uid] && Object.keys(participants).length >= 2) {
        throw new Error("This connection test already has two machines.");
    }

    await set(ref(database, `${connectionTestPath(roomId)}/participants/${user.uid}`), {
        displayName: normalizeDisplayName(displayName),
        role: user.uid === room.hostUid ? "host" : "guest",
        connected: true,
        joinedAt: participants[user.uid]?.joinedAt || serverTimestamp(),
        lastSeenAt: serverTimestamp(),
    });
    await registerConnectionTestPresence(roomId, user.uid);

    return { roomId, user };
};

/**
 * Subscribes to test-room changes and reports null when the host deletes the room.
 *
 * @param {string} roomId Room to observe.
 * @param {(room: object|null) => void} onRoom Snapshot callback.
 * @param {(error: Error) => void} [onError] Subscription error callback.
 * @returns {() => void} Function that detaches the realtime listener.
 */
export const subscribeToConnectionTest = (roomId, onRoom, onError) => {
    const { database } = getFirebaseServices();

    return onValue(
        ref(database, connectionTestPath(roomId)),
        (snapshot) => onRoom(snapshot.exists() ? snapshot.val() : null),
        onError,
    );
};

/**
 * Subscribes to this browser's connection to the Firebase Realtime Database.
 *
 * @param {(isConnected: boolean) => void} onChange Connection-state callback.
 * @returns {() => void} Function that detaches the connection listener.
 */
export const subscribeToFirebaseConnection = (onChange) => {
    const { database } = getFirebaseServices();
    return onValue(ref(database, ".info/connected"), (snapshot) => onChange(snapshot.val() === true));
};

/**
 * Replaces the room's single test signal so both machines receive a live update.
 *
 * @param {string} roomId Active test room.
 * @returns {Promise<void>} Resolves after Firebase accepts the signal.
 */
export const sendConnectionTestSignal = async (roomId) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await set(ref(database, `${connectionTestPath(roomId)}/signal`), {
        id: createRoomId(),
        sentBy: user.uid,
        sentAt: serverTimestamp(),
    });
};

/**
 * Removes the current participant, or the entire room when called by its host.
 *
 * @param {string} roomId Test room to leave.
 * @returns {Promise<void>} Resolves after the participant or room is removed.
 */
export const leaveConnectionTest = async (roomId) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomReference = ref(database, connectionTestPath(roomId));
    const snapshot = await get(roomReference);

    if (!snapshot.exists()) {
        return;
    }

    if (snapshot.val().hostUid === user.uid) {
        await remove(roomReference);
        return;
    }

    await remove(ref(database, `${connectionTestPath(roomId)}/participants/${user.uid}`));
};
