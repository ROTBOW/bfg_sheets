import { getProfileUrl, getUpgradeOptions, torpedoResults } from "@/lib/ship-upgrades.mjs";

const ShipUpgrades = ({ ship, vessel, onChange }) => {
    const upgrades = vessel.upgrades || [];
    const options = getUpgradeOptions(ship, vessel);

    const toggleUpgrade = (id) => {
        const isSelected = upgrades.includes(id);
        const next = isSelected ? upgrades.filter((upgrade) => upgrade !== id) : [...upgrades, id];
        // Removing a prerequisite also removes the refit that relies on it.
        if (isSelected && id === "armoured-prow") {
            onChange({ upgrades: next.filter((upgrade) => upgrade !== "power-ram") });
        } else if (isSelected && id === "prow-torpedoes") {
            onChange({ upgrades: next.filter((upgrade) => upgrade !== "special-torpedoes"), torpedoResult: 0 });
        } else {
            onChange({ upgrades: next, torpedoResult: id === "special-torpedoes" ? 0 : (vessel.torpedoResult || 0) });
        }
    };

    return (
        <details className="ship-upgrades">
            <summary>Upgrades &amp; refits · {upgrades.length} selected</summary>
            <p><a href={getProfileUrl(ship)} target="_blank" rel="noreferrer">Ship profile ↗</a></p>
            {!options.length && <p>No purchasable options for this class.</p>}
            <fieldset>
                <legend className="sr-only">Options for {vessel.name || ship.name}</legend>
                {options.map((option) => {
                    const checked = upgrades.includes(option.id);

                    return (
                        <div className="ship-upgrade" key={option.id}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!checked && Boolean(option.reason)}
                                    onChange={() => toggleUpgrade(option.id)}
                                />
                                <span>
                                    <strong>{option.label} · {option.points > 0 ? "+" : ""}{option.points} pts</strong>
                                    <small>{option.description}</small>
                                    {option.reason && <small>{option.reason}</small>}
                                </span>
                            </label>
                            <a href={option.source} target="_blank" rel="noreferrer" aria-label={`Rules for ${option.label}`}>Rules ↗</a>
                        </div>
                    );
                })}
            </fieldset>
            {upgrades.includes("special-torpedoes") && (
                <label>
                    Record your D6 result (roll at the table)
                    <select
                        value={vessel.torpedoResult || 0}
                        onChange={(event) => onChange({ torpedoResult: Number(event.target.value) })}
                    >
                        {torpedoResults.map((result, roll) => (
                            <option key={result} value={roll}>{roll ? `${roll} · ` : ""}{result}</option>
                        ))}
                    </select>
                </label>
            )}
        </details>
    );
};

export default ShipUpgrades;
