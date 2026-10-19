import {
    changeCriticalDamage,
    criticalDamageSource,
    criticalDamageTypes,
    getCriticalDamageCount,
} from "@/lib/critical-damage.mjs";

const CriticalDamage = ({ entries, onUpdate }) => {
    const activeCount = entries.filter((entry) => entry.status === "active").length;

    const changeDamage = (typeId, delta) => {
        const id = crypto.randomUUID();
        onUpdate((current) => changeCriticalDamage(current, typeId, delta, id));
    };

    return (
        <section className="panel critical-damage" aria-labelledby="critical-damage-heading">
            <div className="panel-heading">
                <h2 id="critical-damage-heading">
                    <span className="section-number">02</span>
                    Critical damage
                </h2>
                <span className="registry" role="status">{activeCount} ACTIVE</span>
            </div>
            <ul className="critical-damage-list">
                {criticalDamageTypes.map((type) => {
                    const count = getCriticalDamageCount(entries, type.id);

                    return (
                        <li key={type.id} className={count > 0 ? "is-damaged" : ""}>
                            <div className="critical-damage-label">
                                <strong>{type.label}</strong>
                                <small>{type.effect}</small>
                                {!type.repairable && <small>Cannot repair during battle</small>}
                            </div>
                            {type.repairable ? (
                                <div className="critical-damage-counter">
                                    <button
                                        type="button"
                                        disabled={count === 0}
                                        onClick={() => changeDamage(type.id, -1)}
                                        aria-label={`Repair or remove one ${type.label} critical`}
                                    >
                                        −
                                    </button>
                                    <output aria-label={`${type.label} active criticals`}>{count}</output>
                                    <button
                                        type="button"
                                        onClick={() => changeDamage(type.id, 1)}
                                        aria-label={`Add ${type.label} critical`}
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <label className="critical-damage-toggle">
                                    <input
                                        type="checkbox"
                                        checked={count > 0}
                                        onChange={(event) => changeDamage(type.id, event.target.checked ? 1 : -1)}
                                        aria-label={`${type.label} damaged (uncheck to correct entry)`}
                                    />
                                    <span>{count > 0 ? "Damaged" : "Intact"}</span>
                                </label>
                            )}
                        </li>
                    );
                })}
            </ul>
            <div className="panel-footnote">
                Use + to record hits and − after repairs.
                Repeated thruster hits still reduce speed by only 10 cm.
                Hull breach (11): D3 hull damage; bulkhead collapse (12): D6.
                Adjust stats manually.
                {" "}<a href={criticalDamageSource} target="_blank" rel="noreferrer">Critical hit rules ↗</a>
            </div>
        </section>
    );
};

export default CriticalDamage;
