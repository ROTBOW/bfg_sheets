import { arkId } from "./upgrades.mjs";

export const isMechanicusCommander = (commander) => (
    ["archmagos-explorator", "archmagos-veneratus"].includes(commander)
);

export const getMechanicusFleetIssues = (fleet, total, getShip) => {
    const issues = [];
    const mechanicus = fleet.ships.filter((vessel) => getShip(vessel.classId).faction === "Adeptus Mechanicus");
    const capitalShips = mechanicus.filter((vessel) => getShip(vessel.classId).type !== "Escort");
    const arks = mechanicus.filter((vessel) => vessel.classId === arkId);
    const isMechanicusFleet = fleet.selectedFaction === "Adeptus Mechanicus";
    const hasArchmagos = isMechanicusCommander(fleet.commander);

    if (capitalShips.length) {
        issues.push("Mechanicus: determine Gifts and the Quest for Knowledge subplot before play. Record results in battle notes; apply their effects manually.");
    }
    if (arks.length > 1) issues.push("Only one Ark Mechanicus may be included.");
    if (arks.length) {
        if (total < 1000) issues.push("An Ark Mechanicus requires at least 1,000 fleet points.");
        if (fleet.commander !== "archmagos-veneratus" || !arks.some((vessel) => vessel.id === fleet.flagshipId)) {
            issues.push("Omnissiah’s Victory must embark an Archmagos Veneratus as flagship.");
        }
        if (!isMechanicusFleet) issues.push("An Ark Mechanicus requires a primarily Adeptus Mechanicus fleet.");
    }

    if (isMechanicusFleet) {
        if (total >= 1000 && fleet.commander === "none") issues.push("This fleet needs a Mechanicus Archmagos (1,000 points or more).");
        if (fleet.commander !== "none" && !hasArchmagos) issues.push("Adeptus Mechanicus fleets use a Mechanicus Archmagos.");

        const battleships = fleet.ships.filter((vessel) => getShip(vessel.classId).type === "Battleship");
        const cruisers = fleet.ships.filter((vessel) => ["Cruiser", "Battlecruiser", "Grand Cruiser"].includes(getShip(vessel.classId).type));
        if (battleships.length * 3 > cruisers.length) issues.push("Mechanicus battleships require three cruisers each (3:1).");

        if (mechanicus.length !== fleet.ships.length) {
            issues.push("Mixed Mechanicus fleet: check reserve ratios, permitted allies and the primarily Mechanicus requirement against the faction rules. Reserve eligibility is not fully automated.");
        }
    } else if (hasArchmagos) {
        issues.push("A Mechanicus Archmagos belongs to an Adeptus Mechanicus fleet.");
    } else if (mechanicus.length) {
        issues.push("Mechanicus reserves: check host-fleet allowances and compulsory disengagement when crippled against the faction rules.");
    }

    if (hasArchmagos && fleet.flagshipId && !capitalShips.some((vessel) => vessel.id === fleet.flagshipId)) {
        issues.push("Embark the Archmagos on a Mechanicus capital ship.");
    }

    const squadronNames = new Set(mechanicus.map((vessel) => vessel.squadron.trim()).filter(Boolean));
    for (const name of squadronNames) {
        const members = fleet.ships.filter((vessel) => vessel.squadron.trim() === name);
        if (members.some((vessel) => getShip(vessel.classId).faction !== "Adeptus Mechanicus")) {
            issues.push(`Squadron “${name}”: Mechanicus ships cannot squadron with ships of other factions.`);
        }
        const escorts = members.filter((vessel) => getShip(vessel.classId).type === "Escort" && getShip(vessel.classId).faction === "Adeptus Mechanicus");
        const upgraded = escorts.filter((vessel) => vessel.upgrades?.includes("additional-turret"));
        if (upgraded.length && upgraded.length !== escorts.length) {
            issues.push(`Squadron “${name}”: every Mechanicus escort must buy the additional turret if any do.`);
        }
    }

    return issues;
};
