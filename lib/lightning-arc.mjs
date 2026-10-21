const arcLabels = {
    front: "Front",
    left: "Left",
    right: "Right",
    rear: "Rear",
};

/** Converts a profile arc label into normalized firing-arc options. */
export const getLightningFireArcs = (arcLabel) => String(arcLabel || "")
    .toLowerCase()
    .split("/")
    .map((arc) => arc.trim())
    .filter((arc) => arcLabels[arc])
    .map((id) => ({ id, label: arcLabels[id] }));

/** Returns this turn's allocations for one Lightning Arc weapon. */
export const getLightningAllocations = (weaponFire, weaponIndex, round, turnSide) => (
    (weaponFire || []).filter((entry) => (
        entry.weaponIndex === weaponIndex
        && entry.weaponType === "Lightning arc"
        && entry.round === round
        && entry.turnSide === turnSide
    ))
);

/** Summarizes remaining strength, unused arcs, and targets already engaged. */
export const getLightningArcAvailability = ({ weapon, weaponIndex, weaponFire, round, turnSide }) => {
    const allocations = getLightningAllocations(weaponFire, weaponIndex, round, turnSide);
    const usedStrength = allocations.reduce((total, entry) => total + (entry.allocatedStrength || 0), 0);
    const usedArcs = new Set(allocations.map((entry) => entry.fireArc).filter(Boolean));
    const usedTargetIds = new Set(allocations.map((entry) => entry.targetShipId));
    const availableArcs = getLightningFireArcs(weapon.arc).filter((arc) => !usedArcs.has(arc.id));

    return {
        allocations,
        availableArcs,
        usedTargetIds,
        remainingStrength: Math.max(0, weapon.strength - usedStrength),
    };
};

