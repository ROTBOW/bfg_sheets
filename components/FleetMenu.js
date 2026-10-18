"use client";

import { useState } from "react";
import HullWarning from "@/components/HullWarning";

const FleetMenu = ({ fleet, selectedShipId, onSelect, className, battleStates, maxHull }) => {
    const [viewMode, setViewMode] = useState("details");
    const isCompact = viewMode === "compact";

    return (
        <aside
            className="fleet-menu"
            aria-label="Fleet selection"
            data-view={viewMode}
        >
            <div className="fleet-heading">
                <div className="fleet-toolbar">
                    <p className="eyebrow">Demo fleet</p>
                    <div
                        className="fleet-view-toggle"
                        role="group"
                        aria-label="Fleet display mode"
                    >
                        {["compact", "details"].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                aria-pressed={viewMode === mode}
                                onClick={() => setViewMode(mode)}
                            >
                                {mode === "compact" ? "Compact" : "Details"}
                            </button>
                        ))}
                    </div>
                </div>
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
                            {!isCompact && (
                                <span className="registry">{vessel.registry}</span>
                            )}
                            <strong>{vessel.name}</strong>
                            {!isCompact && <span>{className}</span>}
                            <span className="fleet-hull">
                                Hull {battleStates[vessel.id].hull} / {maxHull}
                                <HullWarning
                                    hull={battleStates[vessel.id].hull}
                                    maxHull={maxHull}
                                />
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export default FleetMenu;
