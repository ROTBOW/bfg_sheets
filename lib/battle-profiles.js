import { imperialNavyProfiles } from "@/lib/factions/imperial-navy/profiles";
import { spaceMarineProfiles } from "@/lib/factions/space-marines/profiles";
import { mechanicusProfiles } from "@/lib/factions/adeptus-mechanicus/profiles";

// Keep existing class IDs stable so saved fleets continue to resolve.
export const battleProfiles = {
    ...imperialNavyProfiles,
    ...spaceMarineProfiles,
    ...mechanicusProfiles,
};

export const createShipBattleState = (profile) => ({
    hull: profile.stats.hull,
    shields: profile.stats.shields,
    order: "No special orders",
    criticalDamage: [],
    message: "",
});
