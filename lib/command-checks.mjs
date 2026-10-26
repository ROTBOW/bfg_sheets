export const commandCheckFields = [
    "commandCheckFailed",
    "commandCheckPassed",
    "commandCheckRound",
    "commandCheckTurnSide",
];

/** Returns whether one current-turn failure prevents further fleet Command checks. */
export const areFleetCommandChecksBlocked = (battleStates, turn, localSide) => {
    if (!localSide || turn?.activeSide !== localSide) {
        return false;
    }

    return Object.values(battleStates || {}).some((battleState) => (
        battleState.commandCheckFailed === true
        && battleState.commandCheckRound === turn.round
        && battleState.commandCheckTurnSide === localSide
    ));
};

/** Returns a detached battle-state map with only Command-check metadata removed. */
export const clearFleetCommandCheckMetadata = (battleStates) => {
    const clearedStates = {};

    for (const [shipId, battleState] of Object.entries(battleStates || {})) {
        const clearedState = { ...battleState };

        for (const field of commandCheckFields) {
            delete clearedState[field];
        }

        clearedStates[shipId] = clearedState;
    }

    return clearedStates;
};

/** Extracts authoritative room battle maps, including empty maps created by resets. */
export const getRoomBattleStateUpdates = (room) => {
    const roomBattleStates = {};

    for (const side of ["host", "guest"]) {
        const sideFleet = room?.sides?.[side]?.fleet;

        if (sideFleet?.id) {
            roomBattleStates[sideFleet.id] = room.sides[side]?.battle || {};
        }
    }

    return roomBattleStates;
};
