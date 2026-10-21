export const novaCannonOutcomes = [
    { id: "center", label: "Centre hole touches target" },
    { id: "outer", label: "Outer template touches target" },
    { id: "miss", label: "No target touched" },
];

/** Returns the number of scatter-distance dice required at a given range. */
export const getNovaScatterDiceCount = (distanceCm) => {
    if (!Number.isFinite(distanceCm) || distanceCm < 30 || distanceCm > 150) {
        throw new Error("Nova cannon range must be from 30 to 150 cm.");
    }

    if (distanceCm <= 45) return 1;
    if (distanceCm <= 60) return 2;

    return 3;
};

/** Resolves the scatter die, including an angle for an arrow result. */
export const rollNovaScatter = (random = Math.random) => {
    const dieFace = Math.floor(random() * 6) + 1;

    if (dieFace <= 2) {
        return { result: "hit", angleDegrees: null };
    }

    return {
        result: "arrow",
        angleDegrees: Math.floor(random() * 360),
    };
};

/** Returns Nova Cannon hits after the final template position is checked. */
export const getNovaCannonHits = (outcome, damageRoll) => {
    if (outcome === "miss") return 0;
    if (outcome === "outer") return 1;

    if (outcome === "center" && Number.isInteger(damageRoll) && damageRoll >= 1 && damageRoll <= 6) {
        return damageRoll;
    }

    throw new Error("Choose where the Nova Cannon template landed.");
};
