"use client";

import { useState } from "react";
import HullWarning from "@/components/HullWarning";
import ShipName from "@/components/ShipName";

const FleetMenu = ({ fleets, selectedFleetId, onSelectFleet, isFleetSelectionLocked, fleet, selectedShipId, onSelect, battleStates, storageMessage }) => {
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
                            disabled={!fleets.length || isFleetSelectionLocked}
                            title={isFleetSelectionLocked ? "Fleet selection is locked while connected to a room." : undefined}
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
                            <span className="registry">{vessel.registry}</span>
                            <strong>
                                <ShipName
                                    name={vessel.name}
                                    hull={battleStates[vessel.id]?.hull ?? vessel.profile?.stats.hull}
                                />
                            </strong>
                            <span>{vessel.className}</span>
                            {vessel.profile ? (
                                <span className={isCompact ? undefined : "fleet-stats"}>
                                    <span className="fleet-hull">
                                        <span>Hull</span>
                                        <span>{battleStates[vessel.id]?.hull ?? vessel.profile.stats.hull} / {vessel.profile.stats.hull}</span>
                                        <HullWarning
                                            hull={battleStates[vessel.id]?.hull ?? vessel.profile.stats.hull}
                                            maxHull={vessel.profile.stats.hull}
                                        />
                                    </span>
                                    {!isCompact && (
                                        <>
                                            <span className="fleet-stat">
                                                <span>{vessel.profile.faction === "Necrons" ? "Saves" : "Shields"}</span>
                                                <span>
                                                    {vessel.profile.faction === "Necrons"
                                                        ? `${vessel.profile.stats.reactiveHullSave} save`
                                                        : `${battleStates[vessel.id]?.shields ?? vessel.profile.stats.shields} / ${vessel.profile.stats.shields}`}
                                                </span>
                                            </span>
                                            <span className="fleet-stat">
                                                <span>Speed</span>
                                                <span>{vessel.profile.stats.speedCm} cm</span>
                                            </span>
                                            <span className="fleet-stat">
                                                <span>Turns</span>
                                                <span>{vessel.profile.stats.turnDegrees}°</span>
                                            </span>
                                            <span className="fleet-stat">
                                                <span>Armour <small>(front / other)</small></span>
                                                <span>{vessel.profile.stats.armour.front} / {vessel.profile.stats.armour.other}</span>
                                            </span>
                                            <span className="fleet-stat">
                                                <span>Turrets</span>
                                                <span>{vessel.profile.stats.turrets}</span>
                                            </span>
                                        </>
                                    )}
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
