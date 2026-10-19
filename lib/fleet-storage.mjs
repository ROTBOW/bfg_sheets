import { createDemoFleet, parseFleets, storageKey } from "./fleets.mjs";

// Both pages share the same first-use fleet and never reseed a saved empty library.
export const loadFleetLibrary = (storage) => {
    const stored = storage.getItem(storageKey);
    const fleets = stored === null ? [createDemoFleet()] : parseFleets(stored);
    let saveError = false;

    if (stored === null) {
        try {
            storage.setItem(storageKey, JSON.stringify({ version: 1, fleets }));
        } catch {
            saveError = true;
        }
    }

    return { fleets, saveError };
};

export const getDefaultFleetId = (fleets) => (
    fleets.find((fleet) => fleet.name.trim().toLowerCase() === "demo fleet")?.id
    || fleets[0]?.id
    || ""
);
