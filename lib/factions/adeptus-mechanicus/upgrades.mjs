export const mechanicusRulesUrl = "https://battlefleet-game.org/fleet-lists/adeptus-mechanicus/";
export const arkId = "adeptus-mechanicus-omnissiahs-victory-ark-mechanicus";

export const getMechanicusUpgrades = (ship, vessel) => {
    const selected = vessel.upgrades || [];
    const className = ship.id.replace("adeptus-mechanicus-", "").split("-class-")[0];
    const isLightCruiser = ship.id.includes("light-cruiser");
    const options = [];

    const addOption = (id, label, points, description) => {
        options.push({ id, label, points, description, source: mechanicusRulesUrl, reason: "" });
    };

    if (ship.id === arkId) {
        addOption("ark-launch-bays", "Ark launch bays", 10, "Replace each broadside lance battery with two launch-bay squadrons.");
        return options;
    }

    if (ship.type === "Escort") {
        addOption("additional-turret", "Additional turret", 5, "Add one turret. Every escort in the squadron must purchase this refit.");
        return options;
    }

    if ((ship.type === "Cruiser" && !isLightCruiser) || className === "retribution") {
        addOption("nova-cannon", "Nova cannon", className === "retribution" ? 10 : 20, "Replace prow torpedoes with a nova cannon.");
    }
    if (["dictator", "tyrant", "lunar", "endeavour", "endurance"].includes(className)) {
        addOption("extended-batteries", "Plasma-boosted batteries", 10, "Increase 30 cm weapons battery ranges to 45 cm.");
    }
    if (["endeavour", "endurance"].includes(className)) {
        addOption("dorsal-lance", "Dorsal lance exchange", 0, "Replace prow torpedoes with a strength-1, 30 cm lance firing left/front/right.");
    }
    if (isLightCruiser) {
        addOption("armoured-prow", "Armoured prow", 0, "Prow armour becomes 6+; turns reduce to 45°.");
    }

    const bays = { emperor: 8, oberon: 4, dictator: 4, defiant: 2 }[className];
    if (bays) {
        addOption("torpedo-bombers", "Torpedo bombers", bays * 10, "Add torpedo bombers to the available attack craft.");
    }
    const hasTorpedoes = ["retribution", "dictator", "tyrant", "gothic", "lunar", "endeavour", "endurance"].includes(className);
    if (hasTorpedoes) {
        addOption("special-torpedoes", "Special torpedo roll", className === "retribution" ? 30 : 20, "Buy one D6 roll and record the result. One-off game pricing.");
    }
    const armoured = ["retribution", "dictator", "tyrant", "gothic", "lunar"].includes(className);
    if (armoured || isLightCruiser) {
        addOption("power-ram", "Power ram", 5, "Requires a 6+ prow and no nova cannon.");
    }

    for (const option of options) {
        if (option.id === "power-ram") {
            if (selected.includes("nova-cannon")) option.reason = "Remove the nova cannon first.";
            else if (!armoured && !selected.includes("armoured-prow")) option.reason = "Fit an armoured prow first.";
        }
        if (option.id === "special-torpedoes" && selected.some((id) => ["nova-cannon", "dorsal-lance"].includes(id))) {
            option.reason = "The selected weapon exchange removes the torpedo tubes.";
        }
        if (option.id === "nova-cannon" && selected.some((id) => ["special-torpedoes", "power-ram"].includes(id))) {
            option.reason = "Remove special torpedoes and the power ram first.";
        }
        if (option.id === "dorsal-lance" && selected.includes("special-torpedoes")) {
            option.reason = "Remove special torpedoes first.";
        }
    }

    return options;
};
