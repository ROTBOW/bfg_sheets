/** Returns the client timestamp used to synchronize a transient dice presentation. */
export const getLiveRollTimestamp = () => Date.now();

/**
 * Creates one stable animation duration per die for synchronized roll playback.
 *
 * @param {number} count Number of dice that will be animated.
 * @param {() => number} [random=Math.random] Random source returning a value in [0, 1).
 * @returns {number[]} Animation durations from 1,000 through 5,000 milliseconds.
 */
export const createRollDurations = (count, random = Math.random) => (
    Array.from({ length: count }, () => 1000 + Math.floor(random() * 4001))
);
