"use client";

import { useState } from "react";
import { shipCatalog } from "@/lib/fleets.mjs";

const factions = [...new Set(shipCatalog.map((ship) => ship.faction))].sort();

const ShipCatalog = ({ onAdd }) => {
    const [search, setSearch] = useState("");
    const [type, setType] = useState("All");
    const [faction, setFaction] = useState("All");
    const [selection, setSelection] = useState("All");
    const matchingShips = shipCatalog.filter((ship) => (
        (type === "All" || ship.type === type)
        && (faction === "All" || ship.faction === faction)
        && (selection === "All" || (selection === "Reserves" ? Boolean(ship.reserveSource) : !ship.reserveSource))
        && ship.name.toLowerCase().includes(search.toLowerCase())
    ));

    return (
        <section className="panel builder-panel" aria-labelledby="catalog-title">
            <p className="eyebrow">Imperial shipyards</p>
            <h2 id="catalog-title">Add to fleet</h2>
            <label>
                Find a class
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search ships…"
                />
            </label>
            <label>
                Faction
                <select
                    value={faction}
                    onChange={(event) => setFaction(event.target.value)}
                >
                    <option value="All">All factions</option>
                    {factions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </label>
            <label>
                Ship type
                <select value={type} onChange={(event) => setType(event.target.value)}>
                    {["All", "Battleship", "Battlecruiser", "Grand Cruiser", "Cruiser", "Escort"].map((option) => (
                        <option key={option}>{option}</option>
                    ))}
                </select>
            </label>
            <label>
                Fleet selection
                <select value={selection} onChange={(event) => setSelection(event.target.value)}>
                    <option value="All">Core ships &amp; reserves</option>
                    <option value="Core">Gothic Sector core</option>
                    <option value="Reserves">Reserves</option>
                </select>
            </label>
            <ul
                className="builder-catalog"
                aria-label="Available ships"
                tabIndex={0}
            >
                {matchingShips.map((ship) => (
                    <li key={ship.id}>
                        <div>
                            <strong>{ship.name}</strong>
                            <small>{ship.id === "dauntless" ? "Light cruiser" : ship.type} · {ship.points} pts</small>
                            {ship.reserveSource && <small>Reserve · {ship.reserveSource}</small>}
                        </div>
                        <button
                            type="button"
                            onClick={() => onAdd(ship)}
                            aria-label={`Add ${ship.name}`}
                        >
                            + Add
                        </button>
                    </li>
                ))}
            </ul>
            {!matchingShips.length && <p>No matching classes.</p>}
        </section>
    );
};

export default ShipCatalog;
