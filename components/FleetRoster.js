import { getShip } from "@/lib/fleets.mjs";
import { getVesselPoints } from "@/lib/ship-upgrades.mjs";
import ShipUpgrades from "@/components/ShipUpgrades";

const FleetRoster = ({ fleet, onChange }) => {
    const updateShip = (id, changes) => {
        onChange({ ships: fleet.ships.map((ship) => ship.id === id ? { ...ship, ...changes } : ship) });
    };

    const removeShip = (id) => {
        onChange({
            ships: fleet.ships.filter((ship) => ship.id !== id),
            flagshipId: fleet.flagshipId === id ? "" : fleet.flagshipId,
        });
    };

    return (
        <section className="panel builder-panel" aria-labelledby="roster-title">
            <p className="eyebrow">Muster roll</p>
            <h2 id="roster-title">Fleet roster · {fleet.ships.length} ships</h2>
            {!fleet.ships.length && (
                <div className="builder-empty">
                    <h3>Your fleet starts here</h3>
                    <p>Add a class from the shipyards, then name your vessels and assemble your squadrons.</p>
                </div>
            )}
            <ul className="builder-roster">
                {fleet.ships.map((vessel, index) => {
                    const ship = getShip(vessel.classId);

                    return (
                        <li key={vessel.id}>
                            <div className="builder-row">
                                <strong>{ship.name} · {ship.type}</strong>
                                <span>{getVesselPoints(ship, vessel)} pts</span>
                            </div>
                            <small>Faction: {ship.faction}</small>
                            {ship.reserveSource && <small>Reserve · {ship.reserveSource} fleet list</small>}
                            <label>
                                Vessel {index + 1} name
                                <input
                                    value={vessel.name}
                                    maxLength={100}
                                    onChange={(event) => updateShip(vessel.id, { name: event.target.value })}
                                />
                            </label>
                            {ship.type === "Escort" && (
                                <label>
                                    Squadron name (shared by 2–6 escorts)
                                    <input
                                        value={vessel.squadron}
                                        maxLength={80}
                                        onChange={(event) => updateShip(vessel.id, { squadron: event.target.value })}
                                        placeholder="e.g. Sword Squadron"
                                    />
                                </label>
                            )}
                            <ShipUpgrades
                                ship={ship}
                                vessel={vessel}
                                onChange={(changes) => updateShip(vessel.id, changes)}
                            />
                            <div className="builder-row">
                                <small>{fleet.flagshipId === vessel.id && fleet.commander !== "none" ? "Commander aboard" : `${ship.points} pts base · ${getVesselPoints(ship, vessel) - ship.points} pts options`}</small>
                                <button
                                    type="button"
                                    onClick={() => removeShip(vessel.id)}
                                    aria-label={`Remove ${vessel.name || ship.name}, vessel ${index + 1}`}
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default FleetRoster;
