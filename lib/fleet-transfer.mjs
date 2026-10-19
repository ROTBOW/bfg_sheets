import { parseFleets } from "./fleets.mjs";

export const exportFleetJson = (fleet) => (
    JSON.stringify({ version: 1, fleets: [fleet] }, null, 4)
);

export const importFleetJson = (raw) => {
    const fleets = parseFleets(raw);

    if (fleets.length !== 1) {
        throw new Error("Choose a JSON export containing exactly one fleet.");
    }

    const fleet = fleets[0];
    const ships = fleet.ships.map((ship) => ({ ...ship, id: crypto.randomUUID() }));
    const flagshipIndex = fleet.ships.findIndex((ship) => ship.id === fleet.flagshipId);

    // Fresh identities allow repeated imports without sharing tracker state.
    return {
        ...fleet,
        id: crypto.randomUUID(),
        ships,
        flagshipId: ships[flagshipIndex]?.id || "",
    };
};
