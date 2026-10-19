export const criticalDamageSource = "https://battlefleet-game.org/the-shooting-phase/#critical-hits";

// Standard critical table. Stable IDs support manual tracking and future automation.
export const criticalDamageTypes = [
    { id: "dorsal", roll: 2, label: "Dorsal", effect: "Armament offline", repairable: true, extraDamage: 0 },
    { id: "starboard", roll: 3, label: "Starboard (right)", effect: "Armament offline", repairable: true, extraDamage: 0 },
    { id: "port", roll: 4, label: "Port (left)", effect: "Armament offline", repairable: true, extraDamage: 0 },
    { id: "prow", roll: 5, label: "Prow", effect: "Armament offline", repairable: true, extraDamage: 0 },
    { id: "engine", roll: 6, label: "Engine", effect: "No turns · +1 hull damage on hit", repairable: true, extraDamage: 1 },
    { id: "fire", roll: 7, label: "Fire!", effect: "1 hull damage per unresolved fire in the End Phase", repairable: true, extraDamage: 0 },
    { id: "thrusters", roll: 8, label: "Thrusters", effect: "−10 cm speed · +1 hull damage on hit", repairable: true, extraDamage: 1 },
    { id: "bridge", roll: 9, label: "Bridge", effect: "−3 Ld · lose remaining commander re-rolls on flagship", repairable: false, extraDamage: 0 },
    { id: "shields", roll: 10, label: "Shields", effect: "Shield strength 0", repairable: false, extraDamage: 0 },
];

export const getCriticalDamageCount = (entries, typeId) => (
    entries.filter((entry) => entry.typeId === typeId && entry.status === "active").length
);

// Removing a permanent result is a manual correction, not a repair.
export const changeCriticalDamage = (entries, typeId, delta, id) => {
    const type = criticalDamageTypes.find((entry) => entry.id === typeId);
    if (!type) return entries;

    const count = getCriticalDamageCount(entries, typeId);

    if (delta > 0) {
        if (!type.repairable && count > 0) return entries;

        return [...entries, { id, typeId, source: "manual", status: "active" }];
    }

    const index = entries.findIndex((entry) => entry.typeId === typeId && entry.status === "active");
    if (index === -1) return entries;

    return entries.filter((entry, entryIndex) => entryIndex !== index);
};
