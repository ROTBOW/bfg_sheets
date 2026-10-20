"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    createRoom,
    deleteRoom,
    disconnectFromRoom,
    joinRoom,
    sendRoomHandshake,
    subscribeToFirebaseConnection,
    subscribeToRoom,
} from "@/firebase/room-service";
import { clearActiveRoomId, setActiveRoomId } from "@/firebase/active-room";
import { getRoomSideForUser } from "@/firebase/room-schema.mjs";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { getFleetPoints } from "@/lib/fleets.mjs";
import "./connect.css";

/**
 * Produces a readable identifier without weakening the full invite URL.
 *
 * @param {string} roomId Full secure room identifier.
 * @returns {string} Grouped room ID for manual entry.
 */
const formatRoomId = (roomId) => (
    roomId.match(/.{1,4}/g)?.join("-").toUpperCase() || roomId
);

/**
 * Removes visual separators and rejects malformed room identifiers.
 *
 * @param {string} value User-entered room ID.
 * @returns {string} Normalized 32-character lowercase hexadecimal ID.
 */
const normalizeRoomId = (value) => {
    const roomId = value.replaceAll("-", "").trim().toLowerCase();
    return /^[a-f0-9]{32}$/.test(roomId) ? roomId : "";
};

/**
 * Displays the online battle-room setup and live connection status.
 *
 * @returns {import("react").ReactNode} Connect page UI.
 */
const Connect = () => {
    const [fleets, setFleets] = useState([]);
    const [selectedFleetId, setSelectedFleetId] = useState("");
    const [isFleetLibraryLoaded, setIsFleetLibraryLoaded] = useState(false);
    const [displayName, setDisplayName] = useState("Admiral");
    const [roomInput, setRoomInput] = useState("");
    const [roomId, setRoomId] = useState("");
    const [currentUid, setCurrentUid] = useState("");
    const [room, setRoom] = useState(null);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [copyMessage, setCopyMessage] = useState("");
    const isLeaving = useRef(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const inviteRoomId = normalizeRoomId(searchParams.get("room") || "");
        const initializePage = window.requestAnimationFrame(() => {
            try {
                const library = loadFleetLibrary(window.localStorage);
                setFleets(library.fleets);
                setSelectedFleetId(getDefaultFleetId(library.fleets));

                if (library.saveError) {
                    setErrorMessage("Your starter fleet could not be saved in this browser.");
                }
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : String(error));
            } finally {
                setIsFleetLibraryLoaded(true);
            }

            if (inviteRoomId) {
                setRoomInput(formatRoomId(inviteRoomId));
            }
        });
        let unsubscribe;

        try {
            unsubscribe = subscribeToFirebaseConnection(setIsFirebaseConnected);
        } catch (error) {
            window.requestAnimationFrame(() => {
                setErrorMessage(error instanceof Error ? error.message : String(error));
            });
        }

        return () => {
            window.cancelAnimationFrame(initializePage);
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!roomId) {
            return undefined;
        }

        return subscribeToRoom(
            roomId,
            (nextRoom) => {
                setRoom(nextRoom);

                if (!nextRoom && !isLeaving.current) {
                    clearActiveRoomId();
                    setErrorMessage("The host ended this battle room.");
                    setRoomId("");
                    setCurrentUid("");
                }
            },
            (error) => setErrorMessage(error.message),
        );
    }, [roomId]);

    const selectedFleet = useMemo(
        () => fleets.find((fleet) => fleet.id === selectedFleetId) || null,
        [fleets, selectedFleetId],
    );
    const participants = useMemo(() => Object.entries(room?.players || {}), [room]);
    const inviteUrl = roomId && typeof window !== "undefined"
        ? `${window.location.origin}/connect?room=${roomId}`
        : "";
    const currentSide = getRoomSideForUser(room, currentUid);
    const isHost = currentSide === "host";
    const otherParticipant = participants.find(([uid]) => uid !== currentUid)?.[1];
    const hasBothSides = Boolean(room?.sides?.host?.ownerUid && room?.sides?.guest?.ownerUid);
    const isConnectionSecure = Boolean(
        isFirebaseConnected
        && room?.players?.[currentUid]?.connected
        && otherParticipant?.connected
        && hasBothSides
    );
    const hasRemoteHandshake = participants.some(
        ([uid]) => uid !== currentUid && room?.signals?.[uid],
    );

    /** Returns the selected fleet or reports the required selection. */
    const requireSelectedFleet = () => {
        if (selectedFleet) {
            return selectedFleet;
        }

        setErrorMessage("Select a saved fleet before hosting or joining a battle.");
        return null;
    };

    /** Creates a new battle room using the selected local fleet snapshot. */
    const hostBattle = async () => {
        const fleet = requireSelectedFleet();

        if (!fleet) return;

        setIsWorking(true);
        setErrorMessage("");

        try {
            const result = await createRoom({ fleet, displayName });
            setRoomId(result.roomId);
            setCurrentUid(result.user.uid);
            setActiveRoomId(result.roomId);
            setRoomInput(formatRoomId(result.roomId));
            window.history.replaceState(null, "", `/connect?room=${result.roomId}`);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setIsWorking(false);
        }
    };

    /** Joins the entered room using the selected local fleet snapshot. */
    const joinBattle = async () => {
        const fleet = requireSelectedFleet();
        const normalizedRoomId = normalizeRoomId(roomInput);

        if (!fleet) return;

        if (!normalizedRoomId) {
            setErrorMessage("Enter the complete room ID from the host.");
            return;
        }

        setIsWorking(true);
        setErrorMessage("");

        try {
            const result = await joinRoom({
                roomId: normalizedRoomId,
                fleet,
                displayName,
            });
            setRoomId(result.roomId);
            setCurrentUid(result.user.uid);
            setActiveRoomId(result.roomId);
            window.history.replaceState(null, "", `/connect?room=${result.roomId}`);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setIsWorking(false);
        }
    };

    /** Copies the full capability link used by the second player. */
    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopyMessage("Invite link copied.");
        } catch {
            setCopyMessage("Copy failed. Select the link below manually.");
        }
    };

    /** Leaves the room, deleting it entirely when the host ends the session. */
    const leaveBattle = async () => {
        isLeaving.current = true;
        setIsWorking(true);
        setErrorMessage("");

        try {
            if (isHost) {
                await deleteRoom(roomId);
            } else {
                await disconnectFromRoom(roomId);
            }

            setRoom(null);
            setRoomId("");
            setCurrentUid("");
            clearActiveRoomId();
            window.history.replaceState(null, "", "/connect");
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            isLeaving.current = false;
            setIsWorking(false);
        }
    };

    /** Sends this player's independent realtime handshake. */
    const sendHandshake = async () => {
        setIsWorking(true);
        setErrorMessage("");

        try {
            await sendRoomHandshake(roomId);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <main className="connect-page" aria-label="Connect">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">ONLINE BATTLE</p>
                    <h1>Connect your fleets</h1>
                    <p className="subtitle">
                        Choose a fleet, host or join a private room, then continue to the shared battle tracker.
                    </p>
                </div>
            </div>

            <div className="connect-status" role="status">
                <span className={isFirebaseConnected ? "status-light online" : "status-light"} />
                Server {isFirebaseConnected ? "connected" : "offline"}
            </div>

            {errorMessage && <p className="connect-error" role="alert">{errorMessage}</p>}

            {roomId && (
                <section className="panel connection-settings">
                    <div className="connection-room-heading">
                        <div>
                            <p className="eyebrow">CONNECTION SETTINGS</p>
                            <h2>{formatRoomId(roomId)}</h2>
                        </div>
                        <span className="connection-role">{isHost ? "HOST" : "GUEST"}</span>
                    </div>

                    {isHost && (
                        <div className="invite-box">
                            <label htmlFor="connection-invite">Invite link</label>
                            <div>
                                <input id="connection-invite" readOnly value={inviteUrl} />
                                <button type="button" onClick={copyInvite}>Copy</button>
                            </div>
                            {copyMessage && <small role="status">{copyMessage}</small>}
                        </div>
                    )}

                    <div className="participant-grid">
                        {participants.map(([uid, participant]) => {
                            const side = getRoomSideForUser(room, uid);
                            const fleet = room?.sides?.[side]?.fleet;

                            return (
                                <article className="participant-card" key={uid}>
                                    <span className={participant.connected ? "status-light online" : "status-light"} />
                                    <div>
                                        <strong>{participant.displayName}</strong>
                                        <small>
                                            {fleet?.name || "Fleet unavailable"}
                                            {fleet ? ` · ${getFleetPoints(fleet)} points` : ""}
                                            {uid === currentUid ? " · this machine" : " · remote player"}
                                        </small>
                                    </div>
                                </article>
                            );
                        })}
                        {participants.length < 2 && (
                            <article className="participant-card waiting">
                                <span className="status-light" />
                                <div>
                                    <strong>Waiting for an opponent</strong>
                                    <small>Open the invite link on their machine.</small>
                                </div>
                            </article>
                        )}
                    </div>

                    <div className={isConnectionSecure ? "connection-ready secure" : "connection-ready"}>
                        <div>
                            <p className="eyebrow">LIVE CONNECTION</p>
                            <strong>{isConnectionSecure ? "Connection secure" : "Waiting for both fleets"}</strong>
                            <small>
                                {hasRemoteHandshake
                                    ? "Your opponent's realtime handshake was received."
                                    : "Send a handshake after your opponent arrives to verify updates in both directions."}
                            </small>
                        </div>
                        <button
                            type="button"
                            disabled={isWorking || !otherParticipant}
                            onClick={sendHandshake}
                        >
                            Send handshake
                        </button>
                    </div>

                    <div className="connection-actions">
                        {isConnectionSecure && (
                            <Link className="battle-link" href={`/?room=${roomId}`}>
                                Return to battle tracker
                            </Link>
                        )}
                        <button
                            type="button"
                            className="leave-button"
                            disabled={isWorking}
                            onClick={leaveBattle}
                        >
                            {isHost ? "End battle room" : "Leave battle room"}
                        </button>
                    </div>
                </section>
            )}

            <div className="connect-grid">
                <section className="panel connect-panel fleet-selection">
                    <p className="eyebrow">PLAYER AND FLEET</p>
                    <h2>Choose what you are bringing</h2>
                    <div className="identity-fields">
                        <label>
                            Display name
                            <input
                                value={displayName}
                                maxLength={32}
                                disabled={Boolean(roomId)}
                                onChange={(event) => setDisplayName(event.target.value)}
                            />
                        </label>
                        <label>
                            Saved fleet
                            <select
                                value={selectedFleetId}
                                disabled={Boolean(roomId) || !fleets.length}
                                onChange={(event) => setSelectedFleetId(event.target.value)}
                            >
                                {!fleets.length && <option value="">No saved fleets</option>}
                                {fleets.map((fleet) => (
                                    <option value={fleet.id} key={fleet.id}>
                                        {fleet.name} · {getFleetPoints(fleet)} points
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {isFleetLibraryLoaded && !fleets.length && (
                        <p className="fleet-empty">
                            You need a saved fleet first. <Link href="/fleet-creator">Open the fleet creator</Link>.
                        </p>
                    )}
                </section>

                <section className="panel connect-panel">
                    <p className="eyebrow">HOST</p>
                    <h2>Create a battle room</h2>
                    <p>Create a private room and share its invite with your opponent.</p>
                    <button
                        type="button"
                        disabled={isWorking || Boolean(roomId) || !selectedFleet}
                        onClick={hostBattle}
                    >
                        {isWorking ? "Connecting…" : "Host battle"}
                    </button>
                </section>

                <section className="panel connect-panel">
                    <p className="eyebrow">JOIN</p>
                    <h2>Join a battle room</h2>
                    <label>
                        Room ID
                        <input
                            value={roomInput}
                            placeholder="0000-0000-0000-0000-0000-0000-0000-0000"
                            spellCheck="false"
                            autoCapitalize="characters"
                            disabled={Boolean(roomId)}
                            onChange={(event) => setRoomInput(event.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        disabled={isWorking || Boolean(roomId) || !selectedFleet}
                        onClick={joinBattle}
                    >
                        {isWorking ? "Connecting…" : "Join battle"}
                    </button>
                </section>
            </div>
        </main>
    );
};

export default Connect;
