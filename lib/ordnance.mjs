/** Rolls the requested number of D6 using an injectable random source. */
const rollDice = (count, random) => (
    Array.from({ length: count }, () => Math.floor(random() * 6) + 1)
);

/**
 * Resolves turret fire followed by a standard torpedo or bomber attack.
 * Ordnance attacks use the target's lowest armour and bypass shields.
 */
export const resolveOrdnanceHit = ({ weaponType, strength, turrets, armour }, random = Math.random) => {
    const turretRolls = rollDice(turrets, random);
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
