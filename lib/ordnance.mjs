/** Rolls the requested number of D6 using an injectable random source. */
const rollDice = (count, random) => (
    Array.from({ length: count }, () => Math.floor(random() * 6) + 1)
);

/**
 * Resolves turret fire followed by a standard torpedo or bomber attack.
 * Ordnance attacks use the target's lowest armour and bypass shields.
 */
export const resolveOrdnanceHit = (
    { weaponType, strength, turrets, armour, supportingShips = 0 },
    random = Math.random,
) => {
    const massedTurretBonus = Math.min(3, Math.max(0, Number(supportingShips) || 0));
    const turretRolls = rollDice(turrets + massedTurretBonus, random);
    const turretHits = turretRolls.filter((roll) => roll >= 4).length;
    const survivingStrength = Math.max(0, strength - turretHits);

    if (weaponType === "Torpedo") {
        const attackRolls = rollDice(survivingStrength, random);
        const damage = attackRolls.filter((roll) => roll >= armour).length;

        return {
            turretRolls,
            turretHits,
            survivingStrength,
            bomberAttackCounts: [],
            attackRolls,
            damage,
            remainingStrength: survivingStrength - damage,
        };
    }

    const bomberAttackCounts = rollDice(survivingStrength, random)
        .map((roll) => Math.max(0, roll - turrets));
    const attackRolls = rollDice(
        bomberAttackCounts.reduce((total, attacks) => total + attacks, 0),
        random,
    );
    const damage = attackRolls.filter((roll) => roll >= armour).length;

    return {
        turretRolls,
        turretHits,
        survivingStrength,
        bomberAttackCounts,
        attackRolls,
        damage,
        remainingStrength: 0,
    };
};

/** Returns the fleet's total launch-bay strength from its current ship profiles. */
export const getAttackCraftCapacity = (vessels) => vessels.reduce((capacity, vessel) => {
    const launchCapacity = (vessel.profile?.weapons || [])
        .filter((weapon) => weapon.type === "Launch Bay")
        .reduce((shipCapacity, weapon) => shipCapacity + (Number(weapon.strength) || 0), 0);

    return capacity + launchCapacity;
}, 0);

/** Returns active attack-craft strength belonging to one side. */
export const getActiveAttackCraftStrength = (activeOrdnance, side) => activeOrdnance.reduce(
    (strength, marker) => (
        marker.sourceSide === side && marker.weaponType === "Launch Bay"
            ? strength + (Number(marker.strength) || 0)
            : strength
    ),
    0,
);
