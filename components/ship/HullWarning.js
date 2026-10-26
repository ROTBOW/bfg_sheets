const HullWarning = ({ hull, maxHull }) => {
    if (hull > maxHull / 2) {
        return null;
    }

    return (
        <svg
            className="hull-warning"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Ship Crippled (Hull at/below Half)"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        >
            <title>Ship Crippled (Hull at/below Half)</title>
            <path d="M9 3H5L2 12L6 21H10M15 3H19L22 12L18 21H14" />
            <path d="M13 2L10 8L14 11L10 16L12 22" />
            <path d="M5 12H8M16 12H19" />
        </svg>
    );
};

export default HullWarning;
