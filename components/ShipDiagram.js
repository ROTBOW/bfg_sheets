import Image from "next/image";

/** Displays the sourced side-profile image for a vessel. */
const ShipDiagram = ({ ship, vessel }) => {
    if (!ship.image) {
        return <p className="ship-image-placeholder">No ship image available yet.</p>;
    }

    return (
        <Image
            className="ship-image"
            src={ship.image.src}
            width={ship.image.width}
            height={ship.image.height}
            alt={`${vessel.name} — ${ship.className} side profile`}
            sizes="(max-width: 760px) 100vw, 620px"
        />
    );
};

export default ShipDiagram;
