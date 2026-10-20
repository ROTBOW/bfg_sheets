export const gunneryDirections = [
    { id: "closing", label: "Closing" },
    { id: "moving-away", label: "Moving away" },
    { id: "abeam", label: "Abeam" },
];

export const gunneryTable = [
    [1, 1, 1, 1, 0, 0],
    [2, 1, 1, 1, 0, 0],
    [3, 2, 2, 1, 1, 1],
    [4, 3, 2, 1, 1, 1],
    [5, 4, 3, 2, 1, 1],
    [5, 4, 3, 2, 1, 1],
    [6, 5, 4, 2, 1, 1],
    [7, 6, 4, 3, 2, 2],
    [8, 6, 5, 3, 2, 2],
    [9, 7, 5, 4, 2, 2],
    [10, 8, 6, 4, 2, 2],
    [11, 8, 6, 4, 2, 2],
    [12, 9, 7, 5, 3, 3],
    [13, 10, 7, 5, 3, 3],
    [14, 11, 8, 5, 3, 3],
    [14, 11, 8, 6, 3, 3],
    [15, 12, 9, 6, 3, 3],
    [16, 13, 9, 6, 4, 4],
    [17, 13, 10, 7, 4, 4],
    [18, 14, 10, 7, 4, 4],
];

/** Returns the Gunnery-table column for a ship's aspect and type. */
export const getGunneryColumn = (direction, targetType) => {
    const isEscort = targetType === "Escort";
    const columns = {
        closing: isEscort ? 2 : 1,
        "moving-away": isEscort ? 3 : 2,
        abeam: isEscort ? 4 : 3,
    };

    if (!(direction in columns)) {
        throw new Error("Choose a valid target direction.");
    }

    return columns[direction];
};

/** Looks up battery attack dice, splitting Firepower above 20 per the rules. */
export const getGunneryDice = (firepower, direction, targetType) => {
    if (!Number.isInteger(firepower) || firepower < 1) return 0;

    const column = getGunneryColumn(direction, targetType);
    let remainingFirepower = firepower;
    let dice = 0;

    while (remainingFirepower > 0) {
        const tableFirepower = Math.min(remainingFirepower, 20);
        dice += gunneryTable[tableFirepower - 1][column];
        remainingFirepower -= tableFirepower;
    }

    return dice;
};

/**
 * Returns the digital firing rules for a weapon against the selected target.
 * Unknown and non-damage weapon systems remain manual.
 */
export const getWeaponAttackProfile = (weapon, target, direction) => {
    const targetArmour = direction === "closing"
        ? target.stats.armour.front
        : target.stats.armour.other;
    const armourThreshold = Number.parseInt(targetArmour, 10);

    if (weapon.type === "Battery") {
        return {
            supportsDigitalRoll: true,
            diceCount: getGunneryDice(weapon.strength, direction, target.type),
            hitThreshold: armourThreshold,
            shieldBypassRoll: null,
            note: "Uses the target aspect on the Gunnery table.",
        };
    }

    if (weapon.type === "Lightning arc") {
        return {
            supportsDigitalRoll: true,
            diceCount: getGunneryDice(weapon.strength, "closing", target.type),
            hitThreshold: armourThreshold,
            shieldBypassRoll: null,
            note: "Lightning arcs always treat the target as closing.",
        };
    }

    if (weapon.type === "Lance" || weapon.type === "Gauss particle whip") {
        return {
            supportsDigitalRoll: true,
            diceCount: weapon.strength,
            hitThreshold: 4,
            shieldBypassRoll: weapon.type === "Gauss particle whip" ? 6 : null,
            note: weapon.type === "Gauss particle whip"
                ? "Hits on 4+; rolls of 6 bypass shields and equivalent defenses."
                : "Lances hit on 4+ regardless of armour.",
        };
    }

    if (weapon.type === "Star pulse generator") {
        return {
            supportsDigitalRoll: true,
            diceCount: 1,
            hitThreshold: armourThreshold,
            shieldBypassRoll: null,
            note: "Resolve once against every non-Necron ship in range using its nearest armour.",
        };
    }

    return {
        supportsDigitalRoll: false,
        diceCount: weapon.strength,
        hitThreshold: armourThreshold,
        shieldBypassRoll: null,
        note: weapon.type === "Portal"
            ? "Portals resolve as hit-and-run attacks against targets whose shields are down."
            : "Resolve this weapon manually.",
    };
};

/** Counts ordinary hits and any successful rolls that bypass shields. */
export const resolveWeaponRolls = (rolls, attackProfile) => {
    const hits = rolls.filter((roll) => roll >= attackProfile.hitThreshold).length;
    const shieldBypassingHits = attackProfile.shieldBypassRoll == null
        ? 0
        : rolls.filter((roll) => roll >= attackProfile.shieldBypassRoll).length;

    return { hits, shieldBypassingHits };
};

/** Parses comma- or space-separated physical D6 results. */
export const parseDiceResults = (value) => {
    const results = String(value)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);

    if (!results.length || results.some((roll) => !Number.isInteger(roll) || roll < 1 || roll > 6)) {
        throw new Error("Enter each D6 result as a number from 1 to 6.");
    }

    return results;
};

/** Rolls the requested number of D6 using an injectable random source. */
export const rollDice = (count, random = Math.random) => (
    Array.from({ length: count }, () => Math.floor(random() * 6) + 1)
);
