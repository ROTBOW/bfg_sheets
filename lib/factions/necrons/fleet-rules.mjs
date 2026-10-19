export const getNecronFleetIssues = (fleet, getShip) => {
    if (fleet.selectedFaction !== "Necrons") return [];

    const issues = [];
    const countClass = (name) => fleet.ships.filter((vessel) => vessel.classId === `necrons-${name}`).length;
    const limits = [
        ["scythe-class-harvest-ship", 6],
        ["shroud-class-light-cruiser", 3],
        ["jackal-class-raider", 12],
        ["dirge-class-raider", 12],
    ];

    if (fleet.commander !== "none") issues.push("Necrons have no fleet commander; choose No admiral.");
    if (fleet.ships.some((vessel) => getShip(vessel.classId).faction !== "Necrons")) {
        issues.push("The Harvest fleet list contains only Necron ships.");
    }
    if (countClass("cairn-class-tombship") > countClass("scythe-class-harvest-ship")) {
        issues.push("Each Cairn requires one Scythe.");
    }
    for (const [name, maximum] of limits) {
        if (countClass(name) > maximum) {
            issues.push(`${getShip(`necrons-${name}`).name}: maximum ${maximum}.`);
        }
    }
    if (fleet.ships.filter((vessel) => vessel.upgrades?.includes("sepulchre")).length > 1) {
        issues.push("Only one Sepulchre may be fitted per fleet.");
    }

    return issues;
};
