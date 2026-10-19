import { getUpgradeOptions, getVesselPoints, torpedoResults } from "./ship-upgrades.mjs";
import { spaceMarineCatalog } from "./factions/space-marines/catalog.mjs";

// Gothic core plus Bastion and Armageddon reserves, checked 2026-10-18.
export const rulesUrl = "https://battlefleet-game.org/fleet-lists/imperial-navy/#segmentum-obscurus-gothic-sector-fleet-list";
export const storageKey = "bfg-sheets.fleets.v1";

export const shipCatalog = [
    ...spaceMarineCatalog,
    { id: "emperor", name: "Emperor", type: "Battleship", faction: "Imperial Navy", points: 365 },
    { id: "retribution", name: "Retribution", type: "Battleship", faction: "Imperial Navy", points: 345 },
    { id: "mars", name: "Mars", type: "Battlecruiser", faction: "Imperial Navy", points: 270 },
    { id: "overlord", name: "Overlord", type: "Battlecruiser", faction: "Imperial Navy", points: 220 },
    { id: "dictator", name: "Dictator", type: "Cruiser", faction: "Imperial Navy", points: 220 },
    { id: "dominator", name: "Dominator", type: "Cruiser", faction: "Imperial Navy", points: 190 },
    { id: "tyrant", name: "Tyrant", type: "Cruiser", faction: "Imperial Navy", points: 185 },
    { id: "gothic", name: "Gothic", type: "Cruiser", faction: "Imperial Navy", points: 180 },
    { id: "lunar", name: "Lunar", type: "Cruiser", faction: "Imperial Navy", points: 180 },
    { id: "dauntless", name: "Dauntless", type: "Cruiser", faction: "Imperial Navy", points: 110 },
    { id: "firestorm", name: "Firestorm", type: "Escort", faction: "Imperial Navy", points: 40 },
    { id: "sword", name: "Sword", type: "Escort", faction: "Imperial Navy", points: 35 },
    { id: "cobra", name: "Cobra", type: "Escort", faction: "Imperial Navy", points: 30 },
    { id: "apocalypse", name: "Apocalypse", type: "Battleship", faction: "Imperial Navy", points: 365, reserveSource: "Bastion" },
    { id: "exorcist", name: "Exorcist", type: "Grand Cruiser", faction: "Imperial Navy", points: 230, reserveSource: "Bastion" },
    { id: "vengeance", name: "Vengeance", type: "Grand Cruiser", faction: "Imperial Navy", points: 230, reserveSource: "Bastion" },
    { id: "avenger", name: "Avenger", type: "Grand Cruiser", faction: "Imperial Navy", points: 200, reserveSource: "Bastion" },
    { id: "armageddon", name: "Armageddon", type: "Battlecruiser", faction: "Imperial Navy", points: 235, reserveSource: "Bastion" },
    { id: "endeavour", name: "Endeavour", type: "Cruiser", faction: "Imperial Navy", points: 110, reserveSource: "Bastion" },
    { id: "endurance", name: "Endurance", type: "Cruiser", faction: "Imperial Navy", points: 110, reserveSource: "Bastion" },
    { id: "defiant", name: "Defiant", type: "Cruiser", faction: "Imperial Navy", points: 120, reserveSource: "Bastion" },
    { id: "oberon", name: "Oberon", type: "Battleship", faction: "Imperial Navy", points: 335, reserveSource: "Armageddon" },
    { id: "falchion", name: "Falchion", type: "Escort", faction: "Imperial Navy", points: 35, reserveSource: "Armageddon" },
];

export const commanders = [
    { id: "none", name: "No admiral", points: 0 },
    { id: "fleet-admiral", name: "Fleet-Admiral · Ld 8", points: 50 },
    { id: "admiral", name: "Admiral · Ld 9", points: 100 },
    { id: "solar-admiral", name: "Solar Admiral · Ld 10", points: 150 },
    { id: "master-of-the-fleet", name: "Master of the Fleet · Ld 10", points: 50 },
];

export const rerollCosts = [0, 25, 75, 150];
export const getRerollCosts = (fleet) => fleet.commander === "master-of-the-fleet" ? [0, 25, 50, 75] : rerollCosts;
export const getShip = (id) => shipCatalog.find((ship) => ship.id === id);

export const createFleet = () => ({
    id: crypto.randomUUID(),
    name: "Untitled fleet",
    limit: 1500,
    commander: "none",
    flagshipId: "",
    rerolls: 0,
    ships: [],
});

export const createDemoFleet = () => ({
    ...createFleet(),
    name: "Demo fleet",
    ships: ["His Will", "Steadfast"].map((name) => ({
        id: crypto.randomUUID(),
        classId: "lunar",
        name,
        squadron: "",
    })),
});

export const getFleetPoints = (fleet) => {
    let points = commanders.find((commander) => commander.id === fleet.commander).points;

    if (fleet.commander !== "none") {
        points += getRerollCosts(fleet)[fleet.rerolls];
    }

    for (const vessel of fleet.ships) {
        points += getVesselPoints(getShip(vessel.classId), vessel);
    }

    return points;
};

export const getFleetIssues = (fleet) => {
    const issues = [];
    const counts = { Cruiser: 0, Battlecruiser: 0, "Grand Cruiser": 0, Battleship: 0, Escort: 0 };
    const squadrons = new Map();
    const marineShips = fleet.ships.filter((vessel) => getShip(vessel.classId).faction === "Space Marines");
    const hasMarines = marineShips.length > 0;

    for (const vessel of fleet.ships) {
        const ship = getShip(vessel.classId);
        if (ship.faction === "Imperial Navy") counts[ship.type] += 1;

        for (const option of getUpgradeOptions(ship, vessel)) {
            if (vessel.upgrades?.includes(option.id) && option.reason) {
                issues.push(`${vessel.name || ship.name}: ${option.label} — ${option.reason}`);
            }
        }

        if (ship.type === "Escort") {
            const squadron = vessel.squadron.trim();
            squadrons.set(squadron, (squadrons.get(squadron) || 0) + 1);
        }
    }

    const total = getFleetPoints(fleet);

    if (!fleet.ships.length) issues.push("Add ships to begin your roster.");
    if (total > fleet.limit) issues.push(`${total - fleet.limit} points over your budget.`);
    if (counts.Cruiser > 12) issues.push("The cruiser allowance is exceeded.");
    if ((counts.Battlecruiser + counts["Grand Cruiser"]) * 2 > counts.Cruiser) issues.push("Add supporting cruisers for your battlecruisers / grand cruisers (2:1).");
    if (counts.Battleship * 3 > counts.Cruiser + counts.Battlecruiser) issues.push("Your battleships need more cruiser / battlecruiser support (3:1).");
    if (total > 750 && fleet.commander === "none") issues.push(hasMarines ? "This fleet needs a Master of the Fleet." : "This fleet needs an admiral.");
    if (hasMarines) {
        issues.push("Space Marine base profiles are supported. Check Codex / Crusade / Dominion eligibility, allies and optional refits against the faction rules.");
        if (fleet.commander !== "none" && fleet.commander !== "master-of-the-fleet") {
            issues.push("Space Marine fleets use a Master of the Fleet; review your commander selection.");
        }
        const barges = marineShips.filter((vessel) => getShip(vessel.classId).type === "Battleship");
        const cruisers = marineShips.filter((vessel) => getShip(vessel.classId).type === "Cruiser");
        if (barges.length > Math.min(3, Math.ceil(total / 1000))) issues.push("Battle barges: maximum three, with one allowed per 1,000 points or part thereof.");
        if (cruisers.length > 10) issues.push("Space Marine strike cruiser allowance exceeded (maximum 10).");
        if (fleet.commander === "master-of-the-fleet" && barges.length && !barges.some((vessel) => vessel.id === fleet.flagshipId)) {
            issues.push("Assign the Master of the Fleet to a battle barge; check fleet-list exceptions for fortress-monasteries.");
        }
        if (marineShips.filter((vessel) => vessel.classId === "space-marines-seditio-opprimere-venerable-battle-barge").length > 1) {
            issues.push("Only one Venerable Battle Barge may be included.");
        }
        const fortresses = marineShips.filter((vessel) => getShip(vessel.classId).type === "Defence");
        if (fortresses.length) {
            issues.push("Fortress-Monastery: Crusade fleets only; track each quadrant separately in notes.");
            if (fortresses.length > 1 || total < 2000) issues.push("A fortress-monastery requires at least 2,000 fleet points, with a maximum of one.");
        }
    } else if (fleet.commander === "master-of-the-fleet") {
        issues.push("The Master of the Fleet is a Space Marine commander.");
    }
    if (fleet.commander !== "none" && !fleet.ships.some((ship) => ship.id === fleet.flagshipId)) {
        issues.push(fleet.commander === "master-of-the-fleet" ? "Assign your Master of the Fleet to a ship." : "Assign your admiral to a ship.");
    }

    for (const [name, count] of squadrons) {
        if (!name) issues.push("Assign every escort to a named squadron.");
        else if (count < 2 || count > 6) issues.push(`Squadron “${name}” has ${count} escorts; adjust its size (2–6).`);

        const members = fleet.ships.filter((vessel) => getShip(vessel.classId).type === "Escort" && vessel.squadron.trim() === name);
        const cobras = members.filter((vessel) => vessel.classId === "cobra");
        if (cobras.some((vessel) => vessel.upgrades?.includes("detection-gear"))) {
            if (cobras.length * 2 <= members.length || cobras.some((vessel) => !vessel.upgrades?.includes("detection-gear"))) {
                issues.push(`Squadron “${name}”: detection gear needs a Cobra majority and must equip every Cobra.`);
            }
        }
    }

    for (const allowance of getReserveAllowances(fleet)) {
        if (allowance.used > allowance.allowed) {
            issues.push(`Reserve ${allowance.type.toLowerCase()} allowance: ${allowance.used} selected, ${allowance.allowed} available. Add three core ships of this category per reserve.`);
        }
    }

    const endeavours = fleet.ships.filter((vessel) => vessel.classId === "endeavour").length;
    const rareCruisers = fleet.ships.filter((vessel) => ["endurance", "defiant"].includes(vessel.classId)).length;
    if (rareCruisers > endeavours) issues.push("Bastion reserves: Endurance and Defiant combined cannot outnumber Endeavour cruisers.");

    return issues;
};

export const getReserveAllowances = (fleet) => {
    const categories = ["Battleship", "Cruiser", "Escort"];
    return categories.map((type) => {
        let core = 0;
        let used = 0;
        for (const vessel of fleet.ships) {
            const ship = getShip(vessel.classId);
            if (ship.faction !== "Imperial Navy") continue;
            const category = ["Battlecruiser", "Grand Cruiser"].includes(ship.type) ? "Cruiser" : ship.type;
            if (category !== type) continue;
            if (ship.reserveSource) used += 1;
            else core += 1;
        }
        return { type, core, used, allowed: Math.floor(core / 3) };
    });
};

// Reject incompatible data instead of silently replacing someone's saved fleets.
export const parseFleets = (raw) => {
    if (raw === null) return [];

    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.fleets)) throw new Error("Unsupported fleet storage.");

    const fleetIds = new Set();
    for (const fleet of data.fleets) {
        if (!fleet || typeof fleet.id !== "string" || fleetIds.has(fleet.id)
            || typeof fleet.name !== "string" || !Number.isSafeInteger(fleet.limit) || fleet.limit < 1
            || !commanders.some((commander) => commander.id === fleet.commander)
            || typeof fleet.flagshipId !== "string" || !Number.isInteger(fleet.rerolls)
            || fleet.rerolls < 0 || fleet.rerolls > 3 || !Array.isArray(fleet.ships)) {
            throw new Error("Invalid saved fleet.");
        }
        fleetIds.add(fleet.id);

        const shipIds = new Set();
        for (const ship of fleet.ships) {
            if (!ship || typeof ship.id !== "string" || shipIds.has(ship.id)
                || !getShip(ship.classId) || typeof ship.name !== "string" || typeof ship.squadron !== "string") {
                throw new Error("Invalid saved ship.");
            }
            shipIds.add(ship.id);

            // Older saves omit these fields and remain valid without rewriting them.
            if (ship.upgrades !== undefined) {
                const available = getUpgradeOptions(getShip(ship.classId), ship);
                if (!Array.isArray(ship.upgrades)
                    || new Set(ship.upgrades).size !== ship.upgrades.length
                    || ship.upgrades.some((id) => !available.some((option) => option.id === id))) {
                    throw new Error("Invalid saved upgrades.");
                }
            }
            if (ship.torpedoResult !== undefined && (!Number.isInteger(ship.torpedoResult)
                || ship.torpedoResult < 0 || ship.torpedoResult >= torpedoResults.length)) {
                throw new Error("Invalid torpedo roll.");
            }
        }
    }

    return data.fleets;
};
