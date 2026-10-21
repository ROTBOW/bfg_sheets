/**
 * Counts operational ships with at least one weapon that has not fired this turn.
 *
 * @param {Array<object>} vessels Fleet vessels enriched with battle profiles.
 * @param {Record<string, object>} battleStates Battle state keyed by vessel ID.
 * @param {number} round Current battle round.
 * @param {string} turnSide Database side whose turn is active.
 * @returns {number} Number of ships that can still fire.
 */
export const countShipsThatCanFire = (vessels, battleStates, round, turnSide) => {
    let shipCount = 0;

    for (const vessel of vessels) {
        const weapons = vessel.profile?.weapons || [];
        const battleState = battleStates[vessel.id] || {};
        const weaponFire = battleState.weaponFire || [];
        const maximumHull = vessel.profile?.stats?.hull || 0;
        const currentHull = battleState.hull ?? maximumHull;

        if (currentHull <= 0 || weapons.length === 0) {
            continue;
        }

        const hasUnfiredWeapon = weapons.some((weapon, weaponIndex) => (
            !weaponFire.some((entry) => (
                entry.weaponIndex === weaponIndex
                && entry.round === round
                && entry.turnSide === turnSide
            ))
        ));

        if (hasUnfiredWeapon) {
            shipCount += 1;
        }
    }

    return shipCount;
};
