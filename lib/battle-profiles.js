import { imperialNavyProfiles } from "@/lib/factions/imperial-navy/profiles";
import { spaceMarineProfiles } from "@/lib/factions/space-marines/profiles";
import { mechanicusProfiles } from "@/lib/factions/adeptus-mechanicus/profiles";
import { necronProfiles } from "@/lib/factions/necrons/profiles";

// Keep existing class IDs stable so saved fleets continue to resolve.
export const battleProfiles = {
    ...imperialNavyProfiles,
    ...spaceMarineProfiles,
    ...mechanicusProfiles,
    ...necronProfiles,
};

export const createShipBattleState = (profile) => ({
    hull: profile.stats.hull,
    shields: profile.stats.shields,
    order: "No special orders",
    leadership: null,
    criticalDamage: [],
    weaponFire: [],
    message: "",
});
