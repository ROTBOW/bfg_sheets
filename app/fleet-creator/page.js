"use client";

import { useEffect, useRef, useState } from "react";
import ShipCatalog from "@/components/ShipCatalog";
import FleetRoster from "@/components/FleetRoster";
import {
    commanders, createFleet, fleetFactions, getFleetIssues, getFleetPoints,
    getReserveAllowances, getRerollCosts, storageKey,
} from "@/lib/fleets.mjs";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { exportFleetJson, importFleetJson } from "@/lib/fleet-transfer.mjs";
import "./fleet-builder.css";

const factionRulesUrls = {
    "Necrons": "https://battlefleet-game.org/fleet-lists/necrons/",
    "Imperial Navy": "https://battlefleet-game.org/fleet-lists/imperial-navy/",
    "Space Marines": "https://battlefleet-game.org/fleet-lists/space-marines/",
    "Adeptus Mechanicus": "https://battlefleet-game.org/fleet-lists/adeptus-mechanicus/",
};

const FleetCreator = () => {
    const [fleets, setFleets] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveStatus, setSaveStatus] = useState("");
    const [pendingDelete, setPendingDelete] = useState(false);
    const [transferStatus, setTransferStatus] = useState("");
    const [transferError, setTransferError] = useState("");
    const [importing, setImporting] = useState(false);
    const importInput = useRef(null);
    const currentFleets = useRef([]);

    useEffect(() => {
        let active = true;

        // Defer browser storage loading until after hydration.
        queueMicrotask(() => {
            if (!active) return;

            try {
                const { fleets: saved, saveError } = loadFleetLibrary(window.localStorage);
                setFleets(saved);
                currentFleets.current = saved;
                setSelectedId(getDefaultFleetId(saved));
                setLoaded(true);
                setSaveStatus("Saved on this browser only");

                if (saveError) {
                    setSaveStatus("Not saved: browser storage is unavailable or full. Keep this page open and retry saving.");
                }
            } catch {
                setLoadError("Saved fleets could not be read. Your stored data has been left untouched. Check browser storage access and reload to try again.");
            }
        });

        return () => { active = false; };
    }, []);

    const fleet = fleets.find((entry) => entry.id === selectedId);

    const saveFleets = (nextFleets) => {
        currentFleets.current = nextFleets;
        setFleets(nextFleets);

        try {
            window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, fleets: nextFleets }));
            setSaveStatus("Saved on this browser only");
        } catch {
            setSaveStatus("Not saved: browser storage is unavailable or full. Keep this page open and retry saving.");
        }
    };

    const updateFleet = (changes) => {
        saveFleets(fleets.map((entry) => entry.id === selectedId ? { ...entry, ...changes } : entry));
    };

    const addFleet = () => {
        const nextFleet = createFleet();
        saveFleets([...fleets, nextFleet]);
        setSelectedId(nextFleet.id);
        setPendingDelete(false);
    };

    const duplicateFleet = () => {
        const copiedShips = fleet.ships.map((ship) => ({ ...ship, id: crypto.randomUUID() }));
        const flagshipIndex = fleet.ships.findIndex((ship) => ship.id === fleet.flagshipId);
        const copy = {
            ...fleet,
            id: crypto.randomUUID(),
            name: `${fleet.name} (copy)`,
            ships: copiedShips,
            flagshipId: copiedShips[flagshipIndex]?.id || "",
        };
        saveFleets([...fleets, copy]);
        setSelectedId(copy.id);
        setPendingDelete(false);
    };

    const deleteFleet = () => {
        const remaining = fleets.filter((entry) => entry.id !== selectedId);
        saveFleets(remaining);
        setSelectedId(remaining[0]?.id || "");
        setPendingDelete(false);
    };

    const exportFleet = () => {
        setTransferError("");
        setTransferStatus("");

        try {
            const blob = new Blob([exportFleetJson(fleet)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const filename = fleet.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
            link.href = url;
            link.download = `${filename || "fleet"}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setTransferStatus("Fleet JSON download started.");
        } catch {
            setTransferError("The fleet could not be exported. Please try again.");
        }
    };

    const importFleet = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setImporting(true);
        setTransferError("");
        setTransferStatus("");

        try {
            const importedFleet = importFleetJson(await file.text());
            // File reading is asynchronous; retain edits made while it was loading.
            saveFleets([...currentFleets.current, importedFleet]);
            setSelectedId(importedFleet.id);
            setPendingDelete(false);
            setTransferStatus(`Imported “${importedFleet.name || "Untitled fleet"}”.`);
        } catch {
            setTransferError("Could not import this file. Choose a valid single-fleet JSON export from Fleet Creator. Existing fleets have not been changed.");
        } finally {
            setImporting(false);
        }
    };

    const addShip = (ship) => {
        updateFleet({
            ships: [...fleet.ships, {
                id: crypto.randomUUID(),
                classId: ship.id,
                name: `${ship.name} ${fleet.ships.filter((entry) => entry.classId === ship.id).length + 1}`,
                squadron: ship.type === "Escort" ? `${ship.name} Squadron` : "",
                upgrades: [],
                torpedoResult: 0,
            }],
        });
    };

    const points = fleet ? getFleetPoints(fleet) : 0;
    const issues = fleet ? getFleetIssues(fleet) : [];

    return (
        <main className="fleet-builder">
            <header className="page-heading">
                <div>
                    <h1>Fleet Creator</h1>
                    <p className="subtitle">Create your fleets here, or export them to use in a page on another machine</p>
                </div>
            </header>
            {loadError && <p role="alert">{loadError}</p>}
            {!loaded && !loadError && <p role="status">Loading saved fleets…</p>}
            {loaded && (
                <>
                    <section className="panel builder-library" aria-label="Saved fleets">
                        <label>
                            Your fleets · {fleets.length}
                            <select
                                value={selectedId}
                                disabled={!fleets.length}
                                onChange={(event) => {
                                    setSelectedId(event.target.value);
                                    setPendingDelete(false);
                                }}
                            >
                                {!fleets.length && <option value="">No saved fleets</option>}
                                {fleets.map((entry) => (
                                    <option key={entry.id} value={entry.id}>{entry.name || "Untitled fleet"}</option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onClick={addFleet}>+ New fleet</button>
                        {fleet && <button type="button" onClick={duplicateFleet}>Duplicate</button>}
                        {fleet && <button type="button" onClick={() => setPendingDelete(true)}>Delete fleet</button>}
                        {fleet && <button type="button" onClick={exportFleet}>Export fleet</button>}
                        <button
                            type="button"
                            disabled={importing}
                            onClick={() => importInput.current?.click()}
                        >
                            {importing ? "Importing…" : "Import fleet"}
                        </button>
                        <input
                            ref={importInput}
                            type="file"
                            accept=".json,application/json"
                            aria-label="Import fleet JSON file"
                            hidden
                            onChange={importFleet}
                        />
                    </section>
                    {transferError && <p role="alert">{transferError}</p>}
                    {transferStatus && <p role="status">{transferStatus}</p>}
                    <div className="builder-row builder-save">
                        <p role="status">{saveStatus}</p>
                        {saveStatus.startsWith("Not saved") && (
                            <button type="button" onClick={() => saveFleets(fleets)}>Retry save</button>
                        )}
                    </div>
                    {pendingDelete && (
                        <div className="panel builder-confirm" role="alert">
                            <p>Delete “{fleet.name || "Untitled fleet"}”? This cannot be undone.</p>
                            <button type="button" onClick={deleteFleet}>Confirm deletion</button>
                            <button type="button" onClick={() => setPendingDelete(false)}>Keep fleet</button>
                        </div>
                    )}
                    {!fleet && (
                        <section className="panel builder-empty">
                            <h2>No fleets in dock</h2>
                            <p>Create a fleet to start choosing ships. Changes save automatically on this device.</p>
                            <button type="button" onClick={addFleet}>Create your first fleet</button>
                        </section>
                    )}
                    {fleet && (
                        <>
                            <section className="panel builder-settings" aria-label="Fleet details">
                                <label>
                                    Fleet name
                                    <input
                                        value={fleet.name}
                                        maxLength={100}
                                        onChange={(event) => updateFleet({ name: event.target.value })}
                                    />
                                </label>
                                <div className="builder-faction">
                                    <label htmlFor="fleet-faction">Selected Faction</label>
                                    <select
                                        id="fleet-faction"
                                        value={fleet.selectedFaction}
                                        aria-describedby="fleet-faction-help"
                                        onChange={(event) => updateFleet({
                                            selectedFaction: event.target.value,
                                            rerolls: 0,
                                            ...(event.target.value === "Necrons" ? { commander: "none", flagshipId: "" } : {}),
                                        })}
                                    >
                                        {fleetFactions.map((faction) => (
                                            <option key={faction} value={faction}>{faction}</option>
                                        ))}
                                    </select>
                                    <a
                                        id="fleet-faction-help"
                                        className="rules-link"
                                        href={factionRulesUrls[fleet.selectedFaction]}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {fleet.selectedFaction} rules ↗
                                    </a>
                                </div>
                                <label className="builder-budget">
                                    Points budget
                                    <input
                                        type="number"
                                        min="1"
                                        max="100000"
                                        value={fleet.limit}
                                        onChange={(event) => {
                                            const limit = Number(event.target.value);
                                            if (Number.isSafeInteger(limit) && limit > 0 && limit <= 100000) updateFleet({ limit });
                                        }}
                                    />
                                </label>
                                <div className="builder-total" aria-live="polite">
                                    <strong>{points} <small>/ {fleet.limit} pts</small></strong>
                                    <span>{Math.abs(fleet.limit - points)} {points > fleet.limit ? "over budget" : "points remaining"}</span>
                                </div>
                            </section>
                            <div className="builder-columns">
                                <ShipCatalog onAdd={addShip} />
                                <div className="builder-stack">
                                    <FleetRoster fleet={fleet} onChange={updateFleet} />
                                    <section className="panel builder-panel" aria-labelledby="command-title">
                                        <p className="eyebrow">Fleet command</p>
                                        <h2 id="command-title">Commander &amp; re-rolls</h2>
                                        <label>
                                            Commander
                                            <select
                                                value={fleet.commander}
                                                onChange={(event) => updateFleet({ commander: event.target.value, rerolls: 0, flagshipId: "" })}
                                            >
                                                {commanders.map((commander) => (
                                                    <option
                                                        key={commander.id}
                                                        value={commander.id}
                                                        disabled={fleet.selectedFaction === "Necrons" && commander.id !== "none"}
                                                    >
                                                        {commander.name} · {commander.points} pts
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        {(fleet.commander !== "none" || fleet.selectedFaction === "Necrons") && (
                                            <>
                                                {fleet.selectedFaction !== "Necrons" && <label>
                                                    Commander’s ship
                                                    <select value={fleet.flagshipId} onChange={(event) => updateFleet({ flagshipId: event.target.value })}>
                                                        <option value="">Choose a ship</option>
                                                        {fleet.ships.map((ship, index) => (
                                                            <option key={ship.id} value={ship.id}>{index + 1}. {ship.name || "Unnamed vessel"}</option>
                                                        ))}
                                                    </select>
                                                </label>}
                                                <label>
                                                    {fleet.commander === "master-of-the-fleet" || fleet.commander.startsWith("archmagos-") ? "Fleet re-rolls" : "Extra re-rolls (one already included)"}
                                                    <select value={fleet.rerolls} onChange={(event) => updateFleet({ rerolls: Number(event.target.value) })}>
                                                        {getRerollCosts(fleet).map((cost, count) => (
                                                            <option key={count} value={count}>{count} · {cost} pts</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </>
                                        )}
                                    </section>
                                    <section className="panel builder-panel builder-checks" aria-labelledby="checks-title">
                                        <p className="eyebrow">Composition review</p>
                                        <h2 id="checks-title">{issues.length ? `${issues.length} items to review` : "Roster checks passed"}</h2>
                                        {fleet.selectedFaction === "Imperial Navy" && (
                                            <>
                                                <h3>Imperial Navy reserve allowances</h3>
                                                <ul>
                                                    {getReserveAllowances(fleet).map((allowance) => (
                                                        <li key={allowance.type}>
                                                            {allowance.type}: {allowance.used} / {allowance.allowed} reserves · {allowance.core} core
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                        <ul>
                                            {issues.map((issue) => <li key={issue}>{issue}</li>)}
                                        </ul>
                                        <p>Drafts save even when incomplete. Checks cover the supported selections and upgrade conflicts. Record special torpedo rolls before play; campaign refit pricing is not supported.</p>
                                    </section>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </main>
    );
};

export default FleetCreator;
