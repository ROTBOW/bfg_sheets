const FleetMenu = ({ fleet, selectedShipId, onSelect, className, battleStates, maxHull }) => {
    return (
        <aside className="fleet-menu" aria-label="Fleet selection">
            <div className="fleet-heading">
                <p className="eyebrow">Demo fleet</p>
                <h2>Fleet selection</h2>
                <p>{fleet.length} ships · Illustrative statistics</p>
            </div>
            <ul className="fleet-list">
                {fleet.map((vessel) => (
                    <li key={vessel.id}>
                        <button
                            type="button"
                            className="fleet-ship"
                            aria-pressed={selectedShipId === vessel.id}
                            onClick={() => onSelect(vessel.id)}
                        >
                            <span className="registry">{vessel.registry}</span>
                            <strong>{vessel.name}</strong>
                            <span>{className}</span>
                            <span className="fleet-hull">
                                Hull {battleStates[vessel.id].hull} / {maxHull}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export default FleetMenu;
