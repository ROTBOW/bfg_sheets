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

export const necronCriticalDamageSource = "https://battlefleet-game.org/fleet-lists/necrons/#critical-hits-table";

export const necronCriticalDamageTypes = [
    { id: "necron-port", roll: 2, label: "Port power", effect: "Port lightning arcs / whips offline", repairable: true },
    { id: "necron-starboard", roll: 3, label: "Starboard power", effect: "Starboard lightning arcs / whips offline", repairable: true },
    { id: "necron-lightning", roll: 4, label: "Lightning power", effect: "Lightning arcs offline", repairable: true },
    { id: "necron-weapons", roll: 5, label: "Weapon power", effect: "Lightning arcs / whips offline", repairable: true },
    { id: "necron-turns", roll: 6, label: "Turning drive", effect: "No turns", repairable: true, leadershipLoss: 1 },
    { id: "necron-speed", roll: 7, label: "Movement drive", effect: "−5 cm", repairable: true, leadershipLoss: 1 },
    { id: "necron-inertialess", roll: 8, label: "Inertialess drive", effect: "No All ahead full", repairable: true, leadershipLoss: 1 },
    { id: "necron-sepulchre", roll: 9, label: "Sepulchre", effect: "Sepulchre offline; reroll if absent", repairable: true, leadershipLoss: 2 },
    { id: "necron-command", roll: 10, label: "Command core", effect: "Permanent damage", repairable: false, leadershipLoss: 3 },
    { id: "necron-surge", roll: 11, label: "Power surge", effect: "+D3 hull damage", repairable: false, leadershipLoss: 2 },
    { id: "necron-core", roll: 12, label: "Ruptured power core", effect: "+D6 hull damage", repairable: false, leadershipLoss: 2 },
];

export const getCriticalDamageTable = (faction) => (
    faction === "Necrons" ? necronCriticalDamageTypes : criticalDamageTypes
);

export const getCriticalLeadershipLoss = (entries) => entries.reduce((loss, entry) => {
    const type = necronCriticalDamageTypes.find((type) => type.id === entry.typeId);
    return loss + (type?.leadershipLoss || 0);
}, 0);

export const repairNecronCritical = (entries, typeId) => {
    const type = necronCriticalDamageTypes.find((type) => type.id === typeId);
    if (!type?.repairable) return entries;

    const index = entries.findIndex((entry) => entry.typeId === typeId && entry.status === "active");
    return entries.map((entry, entryIndex) => (
        entryIndex === index ? { ...entry, status: "repaired" } : entry
    ));
};

export const removeCriticalEntry = (entries, typeId) => {
    const index = entries.findLastIndex((entry) => entry.typeId === typeId);
    return entries.filter((entry, entryIndex) => entryIndex !== index);
};

// Removing a permanent result is a manual correction, not a repair.
export const changeCriticalDamage = (entries, typeId, delta, id, faction) => {
    const type = getCriticalDamageTable(faction).find((entry) => entry.id === typeId);
    if (!type) return entries;

    const count = getCriticalDamageCount(entries, typeId);

    if (delta > 0) {
        if (faction !== "Necrons" && !type.repairable && count > 0) return entries;

        return [...entries, { id, typeId, source: "manual", status: "active" }];
    }

    const index = entries.findIndex((entry) => entry.typeId === typeId && entry.status === "active");
    if (index === -1) return entries;

    return entries.filter((entry, entryIndex) => entryIndex !== index);
};
