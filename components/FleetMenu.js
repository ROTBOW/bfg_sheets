"use client";

import { useState } from "react";
import HullWarning from "@/components/HullWarning";

const FleetMenu = ({ fleets, selectedFleetId, onSelectFleet, fleet, selectedShipId, onSelect, battleStates, storageMessage }) => {
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
                    <label className="tracker-fleet-picker">
                        <span className="eyebrow">Fleet</span>
                        <select
                            value={selectedFleetId}
                            onChange={(event) => onSelectFleet(event.target.value)}
                            disabled={!fleets.length}
                        >
                            {!fleets.length && <option value="">No saved fleets</option>}
                            {fleets.map((entry) => (
                                <option key={entry.id} value={entry.id}>{entry.name || "Untitled fleet"}</option>
                            ))}
                        </select>
                    </label>
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
                <p>{fleet.length} ships · Session tracking</p>
                {storageMessage && <p role="alert">{storageMessage}</p>}
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
                            {!isCompact && <span>{vessel.className}</span>}
                            {vessel.profile ? (
                                <span className="fleet-hull">
                                    Hull {battleStates[vessel.id]?.hull ?? vessel.profile.stats.hull} / {vessel.profile.stats.hull}
                                    <HullWarning
                                        hull={battleStates[vessel.id]?.hull ?? vessel.profile.stats.hull}
                                        maxHull={vessel.profile.stats.hull}
                                    />
                                </span>
                            ) : <span>Profile pending</span>}
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export default FleetMenu;
