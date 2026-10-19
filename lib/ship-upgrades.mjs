export const refitsUrl = "https://battlefleet-game.org/fleet-lists/refits/";
export const reservesUrl = "https://battlefleet-game.org/fleet-lists/#reserves";

// Equipment used to determine refit eligibility, separate from demo battle stats.
const equipment = {
    emperor: { bays: 8, sharks: 5 },
    retribution: { torpedoes: 9, armoured: true },
    mars: { bays: 4, nova: true, armoured: true },
    overlord: { torpedoes: 6, armoured: true },
    dictator: { bays: 4, torpedoes: 6, armoured: true },
    dominator: { nova: true, armoured: true },
    tyrant: { torpedoes: 6, armoured: true },
    gothic: { torpedoes: 6, armoured: true },
    lunar: { torpedoes: 6, armoured: true },
    dauntless: {},
    apocalypse: { nova: true, armoured: true },
    exorcist: { bays: 4, sharks: 10 },
    vengeance: {},
    avenger: {},
    armageddon: { torpedoes: 6, armoured: true },
    endeavour: { torpedoes: 2 },
    endurance: { torpedoes: 2 },
    defiant: { bays: 2 },
    oberon: { bays: 4, sharks: 5 },
};

const classOptions = {
    lunar: ["nova-cannon"],
    tyrant: ["nova-cannon", "extended-batteries"],
    mars: ["targeting-matrix", "third-turret"],
    overlord: ["targeting-matrix", "third-turret"],
    dominator: ["older-batteries"],
    dauntless: ["prow-torpedoes"],
    cobra: ["detection-gear"],
    armageddon: ["nova-cannon"],
    exorcist: ["close-batteries"],
    endeavour: ["armoured-prow"],
    endurance: ["armoured-prow"],
    defiant: ["armoured-prow"],
};

const options = {
    "nova-cannon": { label: "Nova cannon", points: 20, description: "Replaces prow torpedoes." },
    "extended-batteries": { label: "Extended battery range", points: 10, description: "Upgrade the 30 cm batteries to 45 cm." },
    "targeting-matrix": { label: "Targeting matrix", points: 15, description: "Weapons batteries gain a left column shift." },
    "third-turret": { label: "Third turret", points: 10, description: "Increase turret strength from 2 to 3." },
    "older-batteries": { label: "Earlier battery configuration", points: -5, description: "Each broadside uses firepower 6 at 45 cm." },
    "prow-torpedoes": { label: "Torpedo variant", points: 0, description: "Replace prow lances with strength 6 torpedoes." },
    "detection-gear": { label: "Long-range detection gear", points: 0, description: "Removes squadron batteries; enemy-contact leadership bonus becomes +2. Requires a Cobra majority and this refit on every Cobra in the squadron." },
    "close-batteries": { label: "Close-range batteries", points: 0, description: "Each broadside uses firepower 10 at 30 cm." },
    "armoured-prow": { label: "Armoured prow", points: 0, description: "6+ prow armour; turns reduce to 45°." },
};

export const torpedoResults = [
    "Roll before play", "Short burn", "Guided", "Seeking", "Barrage bombs", "Melta", "Vortex",
];

export const getProfileUrl = (ship) => {
    if (ship.profileUrl) return ship.profileUrl;

    const lightCruisers = ["dauntless", "endeavour", "endurance", "defiant"];
    let type = ship.type.toLowerCase().replaceAll(" ", "-");
    if (lightCruisers.includes(ship.id)) type = "light-cruiser";
    if (ship.type === "Escort") type = ship.id === "cobra" ? "destroyer" : "frigate";

    return `https://ships.battlefleet-game.org/imperial-navy/${ship.id}-class-${type}.html`;
};

export const getUpgradeOptions = (ship, vessel) => {
    const selected = vessel.upgrades || [];
    const fitted = equipment[ship.id] || {};
    const result = (classOptions[ship.id] || []).map((id) => ({ id, ...options[id] }));
    const canArmourProw = (classOptions[ship.id] || []).includes("armoured-prow");

    if (ship.type !== "Escort" && (fitted.armoured || canArmourProw) && !fitted.nova) {
        result.push({ id: "power-ram", label: "Power ram", points: 5, description: "Requires a 6+ prow and no nova cannon.", source: "https://battlefleet-game.org/fleet-lists/imperial-navy/#power-ram" });
    }
    if (ship.type !== "Escort" && (fitted.torpedoes || ship.id === "dauntless")) {
        result.push({ id: "special-torpedoes", label: "Special torpedo roll", points: fitted.torpedoes > 6 ? 30 : 20, description: "Buy one D6 roll; record its result below. One-off game cost.", source: refitsUrl });
    }
    if (fitted.sharks) {
        result.push({ id: "sharks", label: "Shark assault boats", points: fitted.sharks, description: "Adds assault boats to available attack craft." });
    }
    if (fitted.bays) {
        result.push({ id: "torpedo-bombers", label: "Torpedo bombers", points: fitted.bays * 10, description: "Adds torpedo bombers to available attack craft.", source: refitsUrl });
        if (ship.type !== "Battleship") {
            result.push({ id: "orbital-mines", label: "Orbital mines", points: fitted.bays * 5, description: "Replaces all attack craft with mines.", source: refitsUrl });
        }
    }

    for (const option of result) {
        option.source ||= getProfileUrl(ship);
        option.reason = "";
        if (option.id === "power-ram") {
            if (selected.includes("nova-cannon")) option.reason = "Remove the nova cannon first.";
            else if (!fitted.armoured && !selected.includes("armoured-prow")) option.reason = "Fit an armoured prow first.";
        }
        if (option.id === "special-torpedoes") {
            if (selected.includes("nova-cannon")) option.reason = "Nova cannon replaces the torpedo tubes.";
            else if (ship.id === "dauntless" && !selected.includes("prow-torpedoes")) option.reason = "Select the torpedo variant first.";
        }
        if (option.id === "nova-cannon" && selected.some((id) => ["power-ram", "special-torpedoes"].includes(id))) {
            option.reason = "Remove the power ram and special torpedoes first.";
        }
        if (["sharks", "torpedo-bombers"].includes(option.id) && selected.includes("orbital-mines")) {
            option.reason = "Mines replace attack craft; remove the mine refit first.";
        }
        if (option.id === "orbital-mines" && selected.some((id) => ["sharks", "torpedo-bombers"].includes(id))) {
            option.reason = "Remove attack craft upgrades first.";
        }
    }

    return result;
};

export const getVesselPoints = (ship, vessel) => {
    let points = ship.points;
    for (const option of getUpgradeOptions(ship, vessel)) {
        if (vessel.upgrades?.includes(option.id)) points += option.points;
    }
    return points;
};
