import {
    changeCriticalDamage,
    criticalDamageSource,
    getCriticalDamageTable,
    getCriticalLeadershipLoss,
    necronCriticalDamageSource,
    repairNecronCritical,
    removeCriticalEntry,
    getCriticalDamageCount,
} from "@/lib/critical-damage.mjs";

const CriticalDamage = ({ entries, onUpdate, faction, hasSepulchre = false }) => {
    const isNecron = faction === "Necrons";
    const types = getCriticalDamageTable(faction);
    const activeCount = entries.filter((entry) => entry.status === "active").length;

    const changeDamage = (typeId, delta) => {
        const id = crypto.randomUUID();
        onUpdate((current) => changeCriticalDamage(current, typeId, delta, id, faction));
    };

    return (
        <section className="panel critical-damage" aria-labelledby="critical-damage-heading">
            <div className="panel-heading">
                <h2 id="critical-damage-heading">
                    <span className="section-number">02</span>
                    {isNecron ? "Necron critical damage" : "Critical damage"}
                </h2>
                <span className="registry" role="status">{activeCount} ACTIVE</span>
            </div>
            <ul className="critical-damage-list">
                {types.map((type) => {
                    const count = getCriticalDamageCount(entries, type.id);

                    return (
                        <li key={type.id} className={count > 0 ? "is-damaged" : ""}>
                            <div className="critical-damage-label">
                                <strong>{type.roll} · {type.label}</strong>
                                <small>{type.effect}</small>
                                {type.leadershipLoss && <small>Permanent −{type.leadershipLoss} Ld per hit</small>}
                                {!type.repairable && <small>Cannot repair during battle</small>}
                            </div>
                            {isNecron ? (
                                <div className="critical-damage-counter">
                                    {type.repairable && (
                                        <button
                                            type="button"
                                            disabled={count === 0}
                                            onClick={() => onUpdate((current) => repairNecronCritical(current, type.id))}
                                            aria-label={`Repair one ${type.label} critical`}
                                        >
                                            −
                                        </button>
                                    )}
                                    <output aria-label={`${type.label} active criticals`}>{count}</output>
                                    <button
                                        type="button"
                                        disabled={type.id === "necron-sepulchre" && !hasSepulchre}
                                        onClick={() => changeDamage(type.id, 1)}
                                        aria-label={`Add ${type.label} critical`}
                                    >
                                        +
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!entries.some((entry) => entry.typeId === type.id)}
                                        onClick={() => onUpdate((current) => removeCriticalEntry(current, type.id))}
                                        aria-label={`Undo last ${type.label} entry including permanent penalty`}
                                        title="Correct last entry, including its permanent penalty"
                                    >
                                        ↶
                                    </button>
                                </div>
                            ) : type.repairable ? (
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
                {isNecron ? (
                    <>
                        Permanent Leadership loss: −{getCriticalLeadershipLoss(entries)}.
                        Repair with −; ↶ corrects an entry. Repairs preserve Leadership penalties.
                        Apply hull damage and other effects manually.
                    </>
                ) : (
                    <>
                        Use + to record hits and − after repairs.
                        Repeated thruster hits still reduce speed by only 10 cm.
                        Hull breach (11): D3 hull damage; bulkhead collapse (12): D6.
                        Adjust stats manually.
                    </>
                )}
                {" "}<a className="rules-link" href={isNecron ? necronCriticalDamageSource : criticalDamageSource} target="_blank" rel="noreferrer">Critical hit rules ↗</a>
            </div>
        </section>
    );
};

export default CriticalDamage;
