import { imperialNavyProfiles } from "@/lib/factions/imperial-navy/profiles";

// Keep existing class IDs stable so saved fleets continue to resolve.
export const battleProfiles = {
    ...imperialNavyProfiles,
};

export const createShipBattleState = (profile) => ({
    hull: profile.stats.hull,
    shields: profile.stats.shields,
    order: "No special orders",
    notes: "",
    message: "",
});
