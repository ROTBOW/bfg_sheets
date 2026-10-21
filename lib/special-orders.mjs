export const ordnanceWeaponTypes = new Set(["Torpedo", "Launch Bay"]);

const halfArmamentOrders = new Set([
    "All ahead full",
    "Come to new heading",
    "Burn retros",
    "Brace for impact",
]);

/** Returns whether the weapon is prevented from firing by the active order. */
export const isWeaponDisabledByOrder = (weapon, order) => (
    weapon.type === "Nova Cannon" && halfArmamentOrders.has(order)
);

/** Returns weapon Strength after special-order penalties, rounding halves up. */
export const getOrderedWeaponStrength = (weapon, order) => {
    const isOrdnance = ordnanceWeaponTypes.has(weapon.type);
    const isHalved = order === "Brace for impact"
        ? true
        : halfArmamentOrders.has(order) && !isOrdnance;

    return isHalved ? Math.ceil(weapon.strength / 2) : weapon.strength;
};

/** Returns whether Lock On grants this weapon failed-hit re-rolls. */
export const canLockOnReroll = (weapon, order) => (
    order === "Lock on"
    && ["Battery", "Lightning arc", "Lance", "Gauss particle whip"].includes(weapon.type)
);

/** Describes movement characteristics while the ship is on special orders. */
export const getOrderedMovement = (speedCm, turnDegrees, order) => {
    const halfSpeed = Math.ceil(speedCm / 2);
    const base = {
        speed: `${speedCm}`,
        turns: `${turnDegrees}°`,
        speedChanged: false,
        turnsChanged: false,
        explanation: "",
    };

    if (order === "All ahead full") {
        return {
            speed: `${speedCm} + 4D6`,
            turns: "None",
            speedChanged: true,
            turnsChanged: true,
            explanation: "All Ahead Full adds 4D6 cm and prevents turns.",
        };
    }

    if (order === "Come to new heading") {
        return {
            ...base,
            speed: `${halfSpeed}–${speedCm}`,
            turns: `${turnDegrees}° ×2`,
            turnsChanged: true,
            explanation: "Come to New Heading allows up to two turns after moving the normal minimum distance for each.",
        };
    }

    if (order === "Burn retros") {
        return {
            speed: `0–${halfSpeed}`,
            turns: `${turnDegrees}°`,
            speedChanged: true,
            turnsChanged: false,
            explanation: "Burn Retros limits movement to half speed and permits one turn without moving forward first.",
        };
    }

    if (["Lock on", "Reload ordnance", "Brace for impact"].includes(order)) {
        return {
            ...base,
            speed: `${halfSpeed}–${speedCm}`,
            explanation: `${order} requires movement between half and full cruising speed.`,
        };
    }

    return base;
};
