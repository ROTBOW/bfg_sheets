const ShipName = ({ name, hull }) => {
    const isDestroyed = hull === 0;

    return (
        <span className={isDestroyed ? "ship-name-destroyed" : undefined}>
            {name}
            {isDestroyed && (
                <svg
                    className="ship-name-skull"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    shapeRendering="crispEdges"
                    role="img"
                    aria-label="Destroyed (0 hull)"
                >
                    <title>Destroyed (0 hull)</title>
                    <path
                        fillRule="evenodd"
                        d="M3 1H9V2H10V3H11V8H9V11H8V10H7V11H5V10H4V11H3V8H1V3H2V2H3Z M3 4V6H5V4Z M7 4V6H9V4Z M5 7V8H7V7Z"
                    />
                </svg>
            )}
        </span>
    );
};

export default ShipName;
