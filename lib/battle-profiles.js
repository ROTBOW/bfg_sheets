import apocalypse from "@/public/ships/apocalypse-class-battleship.json";
import armageddon from "@/public/ships/armageddon-class-battlecruiser.json";
import avenger from "@/public/ships/avenger-class-grand-cruiser.json";
import cobra from "@/public/ships/cobra-class-destroyer.json";
import dauntless from "@/public/ships/dauntless-class-light-cruiser.json";
import defiant from "@/public/ships/defiant-class-light-cruiser.json";
import dictator from "@/public/ships/dictator-class-cruiser.json";
import dominator from "@/public/ships/dominator-class-cruiser.json";
import dominion from "@/public/ships/dominion-class-battlecruiser.json";
import emperor from "@/public/ships/emperor-class-battleship.json";
import endeavourBakka from "@/public/ships/endeavour-class-light-cruiser-bakka.json";
import endeavour from "@/public/ships/endeavour-class-light-cruiser.json";
import enduranceBakka from "@/public/ships/endurance-class-light-cruiser-bakka.json";
import endurance from "@/public/ships/endurance-class-light-cruiser.json";
import exorcist from "@/public/ships/exorcist-class-grand-cruiser.json";
import falchion from "@/public/ships/falchion-class-frigate.json";
import firestorm from "@/public/ships/firestorm-class-frigate.json";
import gothic from "@/public/ships/gothic-class-cruiser.json";
import havoc from "@/public/ships/havoc-class-frigate.json";
import jovian from "@/public/ships/jovian-class-battlecruiser.json";
import lunar from "@/public/ships/lunar-class-cruiser.json";
import mars from "@/public/ships/mars-class-battlecruiser.json";
import mercury from "@/public/ships/mercury-class-battlecruiser.json";
import oberon from "@/public/ships/oberon-class-battleship.json";
import overlord from "@/public/ships/overlord-class-battlecruiser.json";
import retribution from "@/public/ships/retribution-class-battleship.json";
import siluria from "@/public/ships/siluria-class-light-cruiser.json";
import sword from "@/public/ships/sword-class-frigate.json";
import transport from "@/public/ships/transport.json";
import tyrant from "@/public/ships/tyrant-class-cruiser.json";
import vanquisher from "@/public/ships/vanquisher-class-battleship.json";
import vengeance from "@/public/ships/vengeance-class-grand-cruiser.json";
import victory from "@/public/ships/victory-class-battleship.json";
import viper from "@/public/ships/viper-class-destroyer.json";

// Profile availability does not grant fleet-list eligibility.
export const battleProfiles = {
    apocalypse,
    armageddon,
    avenger,
    cobra,
    dauntless,
    defiant,
    dictator,
    dominator,
    dominion,
    emperor,
    "endeavour-bakka": endeavourBakka,
    endeavour,
    "endurance-bakka": enduranceBakka,
    endurance,
    exorcist,
    falchion,
    firestorm,
    gothic,
    havoc,
    jovian,
    lunar,
    mars,
    mercury,
    oberon,
    overlord,
    retribution,
    siluria,
    sword,
    transport,
    tyrant,
    vanquisher,
    vengeance,
    victory,
    viper,
};

export const createShipBattleState = (profile) => ({
    hull: profile.stats.hull,
    shields: profile.stats.shields,
    order: "No special orders",
    notes: "",
    message: "",
});
