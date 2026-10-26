"use client";

import { useState } from "react";
import HullWarning from "@/components/ship/HullWarning";
import ShipName from "@/components/ship/ShipName";

const FleetMenu = ({
    fleets = [],
    selectedFleetId = "",
    onSelectFleet,
    isFleetSelectionLocked = false,
    fleet,
    selectedShipId,
    onSelect,
    battleStates,
    storageMessage,
    title = "Fleet selection",
    label = "Fleet",
    fleetName = "",
    side = "friendly",
}) => {
    const [viewMode, setViewMode] = useState(() => fleet.length >= 8 ? "compact" : "details");
    const [search, setSearch] = useState("");
    const isCompact = viewMode === "compact";
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const visibleFleet = normalizedSearch
        ? fleet.filter((vessel) => (
            String(vessel.name || "").toLocaleLowerCase().includes(normalizedSearch)
            || String(vessel.className || "").toLocaleLowerCase().includes(normalizedSearch)
            || String(vessel.registry || "").toLocaleLowerCase().includes(normalizedSearch)
            || String(vessel.squadron || "").toLocaleLowerCase().includes(normalizedSearch)
        ))
        : fleet;

    return (
        <aside
            className="fleet-menu"
            aria-label={title}
            data-view={viewMode}
            data-side={side}
        >
            <div className="fleet-heading">
                <div className="fleet-toolbar">
                    {onSelectFleet ? (
                        <label className={`tracker-fleet-picker${isFleetSelectionLocked ? " is-locked" : ""}`}>
                            <span className="fleet-picker-label">
                                <span className="eyebrow">{label}</span>
                                {isFleetSelectionLocked && (
                                    <span className="fleet-picker-lock ml-2">
                                        <span aria-hidden="true" className="mr-1">🔒</span>
                                        other fleets Locked while in battle
                                    </span>
                                )}
                            </span>
                            <span className="fleet-select-control">
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
                            </span>
                        </label>
                    ) : (
                        <div className="tracker-fleet-name">
                            <span className="eyebrow">{label}</span>
                            <strong>{fleetName || "Awaiting opponent"}</strong>
                        </div>
                    )}
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
                <h2>{title}</h2>
                <p>{fleet.length} ships · Session tracking</p>
                {fleet.length >= 8 && (
                    <label className="fleet-search">
                        <span>Find a ship</span>
                        <input
                            type="search"
                            value={search}
                            placeholder="Name, class, registry…"
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                )}
                {storageMessage && <p role="alert">{storageMessage}</p>}
            </div>
            <ul className="fleet-list">
                {visibleFleet.map((vessel) => (
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
                            {!isCompact && <span>{vessel.className}</span>}
                            {vessel.profile ? (
                                <span className={isCompact ? "compact-ship-status" : "fleet-stats"}>
                                    <span className="fleet-hull">
                                        <span>{isCompact ? "H" : "Hull"}</span>
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
                {!visibleFleet.length && (
                    <li className="fleet-list-empty">No ships match “{search.trim()}”.</li>
                )}
            </ul>
        </aside>
    );
};

export default FleetMenu;
