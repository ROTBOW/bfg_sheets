const novaCannon = {
    name: "Prow nova cannon",
    type: "Nova Cannon",
    rangeCm: null,
    rangeLabel: "30 – 150 cm",
    strength: 1,
    arc: "Front",
};

const replaceWeapons = (weapons, predicate, replacement) => {
    const firstIndex = weapons.findIndex(predicate);

    if (firstIndex === -1) {
        return weapons;
    }

    return [
        ...weapons.slice(0, firstIndex),
        replacement,
        ...weapons.slice(firstIndex + 1).filter((weapon) => !predicate(weapon)),
    ];
};

/**
 * Applies a fleet-builder vessel's purchased equipment to its battle profile.
 * The base profile is never mutated, so multiple copies of one class may use different refits.
 */
export const deriveBattleProfile = (baseProfile, vessel = {}) => {
    if (!baseProfile) {
        return null;
    }

    const upgrades = new Set(vessel.upgrades || []);
    const profile = {
        ...baseProfile,
        stats: {
            ...baseProfile.stats,
            armour: { ...baseProfile.stats.armour },
        },
        weapons: baseProfile.weapons.map((weapon) => ({ ...weapon })),
    };

    if (upgrades.has("nova-cannon")) {
        profile.weapons = replaceWeapons(
            profile.weapons,
            (weapon) => weapon.type === "Torpedo" && weapon.arc.toLowerCase().includes("front"),
            { ...novaCannon },
        );
    }

    if (upgrades.has("prow-torpedoes")) {
        profile.weapons = replaceWeapons(
            profile.weapons,
            (weapon) => weapon.type === "Lance" && weapon.name.toLowerCase().includes("prow"),
            {
                name: "Prow torpedoes",
                type: "Torpedo",
                rangeCm: 30,
                strength: 6,
                arc: "Front",
            },
        );
    }

    if (upgrades.has("dorsal-lance")) {
        profile.weapons = replaceWeapons(
            profile.weapons,
            (weapon) => weapon.type === "Torpedo" && weapon.arc.toLowerCase().includes("front"),
            {
                name: "Dorsal lance battery",
                type: "Lance",
                rangeCm: 30,
                strength: 1,
                arc: "Left / Front / Right",
            },
        );
    }

    if (upgrades.has("extended-batteries")) {
        profile.weapons = profile.weapons.map((weapon) => (
            weapon.type === "Battery" && weapon.rangeCm === 30
                ? { ...weapon, rangeCm: 45 }
                : weapon
        ));
    }

    if (upgrades.has("older-batteries")) {
        profile.weapons = profile.weapons.map((weapon) => (
            weapon.type === "Battery" && ["Left", "Right"].includes(weapon.arc)
                ? { ...weapon, rangeCm: 45, strength: 6 }
                : weapon
        ));
    }

    if (upgrades.has("close-batteries")) {
        profile.weapons = profile.weapons.map((weapon) => (
            weapon.type === "Battery" && ["Left", "Right"].includes(weapon.arc)
                ? { ...weapon, rangeCm: 30, strength: 10 }
                : weapon
        ));
    }

    if (upgrades.has("targeting-matrix")) {
        profile.weapons = profile.weapons.map((weapon) => (
            weapon.type === "Battery"
                ? { ...weapon, gunneryColumnShift: -1 }
                : weapon
        ));
    }

    if (upgrades.has("ark-launch-bays")) {
        profile.weapons = profile.weapons.map((weapon) => {
            if (weapon.type !== "Lance" || !["Left", "Right"].includes(weapon.arc)) {
                return weapon;
            }

            return {
                name: `${weapon.arc} launch bays`,
                type: "Launch Bay",
                rangeCm: null,
                strength: 2,
                strengthUnit: "squadrons",
                arc: "–",
            };
        });
    }

    if (upgrades.has("armoured-prow")) {
        profile.stats.armour.front = "6+";
        profile.stats.turnDegrees = 45;
    }

    if (upgrades.has("third-turret")) {
        profile.stats.turrets = 3;
    }

    if (upgrades.has("additional-turret")) {
        profile.stats.turrets += 1;
    }

    return profile;
};
