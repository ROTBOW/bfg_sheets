/**
 * Resolves a D6 result against the faction's starting Leadership table.
 *
 * @param {string} faction Ship faction name.
 * @param {number} roll Whole-number D6 result from 1 through 6.
 * @param {boolean} [hasSepulchre=false] Whether a Necron ship carries a Sepulchre.
 * @returns {number} Starting Leadership value.
 * @throws {RangeError} When roll is not a valid D6 result.
 */
export const getLeadershipForRoll = (faction, roll, hasSepulchre = false) => {
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
        throw new RangeError("Leadership rolls must be whole numbers from 1 through 6.");
    }

    if (faction === "Necrons" && hasSepulchre) {
        return 10;
    }

    if (faction === "Space Marines") {
        return Math.ceil(roll / 2) + 7;
    }

    if (faction === "Adeptus Mechanicus") {
        if (roll === 1) return 7;
        if (roll <= 3) return 8;
        return 9;
    }

    if (roll === 1) return 6;
    if (roll <= 3) return 7;
    if (roll <= 5) return 8;
    return 9;
};

/**
 * Rolls a D6 and resolves the ship's starting Leadership.
 *
 * @param {string} faction Ship faction name.
 * @param {boolean} [hasSepulchre=false] Whether a Necron ship carries a Sepulchre.
 * @param {() => number} [random=Math.random] Random source returning a value in [0, 1).
 * @returns {{ roll: number, leadership: number }} Dice and Leadership results.
 */
export const rollLeadership = (faction, hasSepulchre = false, random = Math.random) => {
    const roll = Math.floor(random() * 6) + 1;

    return {
        roll,
        leadership: getLeadershipForRoll(faction, roll, hasSepulchre),
    };
};

/**
 * Resolves a special-order Command check, including the two core modifiers.
 * Rolls of 11 or 12 always fail, even when modified Leadership is 10.
 *
 * @param {number} leadership Ship or squadron Leadership value.
 * @param {object} [options] Command-check circumstances.
 * @param {boolean} [options.hasBlastMarker=false] Whether a Blast Marker touches the base.
 * @param {boolean} [options.hasEnemyOnSpecialOrders=false] Whether any enemy is on special orders.
 * @param {() => number} [options.random=Math.random] Random source returning a value in [0, 1).
 * @returns {{ dice: [number, number], roll: number, modifiedLeadership: number, passed: boolean }} Check result.
 * @throws {RangeError} When Leadership is not a whole number from 1 through 10.
 */
export const resolveCommandCheck = (leadership, {
    hasBlastMarker = false,
    hasEnemyOnSpecialOrders = false,
    random = Math.random,
} = {}) => {
    if (!Number.isInteger(leadership) || leadership < 1 || leadership > 10) {
        throw new RangeError("Command checks require Leadership from 1 through 10.");
    }

    const modifier = Number(hasEnemyOnSpecialOrders) - Number(hasBlastMarker);
    const modifiedLeadership = Math.min(10, Math.max(1, leadership + modifier));
    const dice = [
        Math.floor(random() * 6) + 1,
        Math.floor(random() * 6) + 1,
    ];
    const roll = dice[0] + dice[1];

    return {
        dice,
        roll,
        modifiedLeadership,
        passed: roll <= modifiedLeadership && roll < 11,
    };
};
