"use client";

const activeRoomStorageKey = "bfg-sheets.active-room.v1";
const activeRoomFleetStorageKey = "bfg-sheets.active-room-fleet.v1";
const activeRoomChangeEvent = "activeroomchange";
const validRoomIdPattern = /^[a-f0-9]{32}$/;

/**
 * Reads the active room ID for this browser tab.
 *
 * @returns {string} Active room ID, or an empty string when disconnected.
 */
export const getActiveRoomId = () => {
    const roomId = window.sessionStorage.getItem(activeRoomStorageKey) || "";
    return validRoomIdPattern.test(roomId) ? roomId : "";
};

/**
 * Supplies the hydration-safe room state used during server rendering.
 *
 * @returns {string} Empty room ID because session storage is client-only.
 */
export const getServerActiveRoomId = () => "";

/**
 * Reads the local fleet committed to the active room in this browser tab.
 *
 * @returns {string} Selected fleet ID, or an empty string when unavailable.
 */
export const getActiveRoomFleetId = () => (
    window.sessionStorage.getItem(activeRoomFleetStorageKey) || ""
);

/**
 * Subscribes to room changes made by the connection flow in this tab.
 *
 * @param {() => void} onChange React external-store change callback.
 * @returns {() => void} Function that removes the event listener.
 */
export const subscribeToActiveRoom = (onChange) => {
    window.addEventListener(activeRoomChangeEvent, onChange);
    return () => window.removeEventListener(activeRoomChangeEvent, onChange);
};

/**
 * Stores the active room for navigation between the connect page and tracker.
 *
 * @param {string} roomId Valid 32-character room identifier.
 * @param {string} [fleetId=""] Local fleet committed to the room.
 * @returns {void}
 * @throws {Error} When the supplied room identifier is malformed.
 */
export const setActiveRoomId = (roomId, fleetId = "") => {
    if (!validRoomIdPattern.test(roomId)) {
        throw new Error("Cannot activate an invalid room identifier.");
    }

    window.sessionStorage.setItem(activeRoomStorageKey, roomId);

    if (fleetId) {
        window.sessionStorage.setItem(activeRoomFleetStorageKey, fleetId);
    } else {
        window.sessionStorage.removeItem(activeRoomFleetStorageKey);
    }

    window.dispatchEvent(new Event(activeRoomChangeEvent));
};

/**
 * Clears the active room after leaving or when the host closes it.
 *
 * @returns {void}
 */
export const clearActiveRoomId = () => {
    window.sessionStorage.removeItem(activeRoomStorageKey);
    window.sessionStorage.removeItem(activeRoomFleetStorageKey);
    window.dispatchEvent(new Event(activeRoomChangeEvent));
};
