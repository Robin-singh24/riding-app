import { Location } from "./ride.dto";

const EARTH_RADIUS_KM = 6371;

const BASE_FARE = 50;
const PER_KM_RATE = 12;

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

//Haversine formula
function calculateDistance(
    pickup: Location,
    destination: Location
): number {
    const lat1 = toRadians(pickup.lat);
    const lon1 = toRadians(pickup.lng);

    const lat2 = toRadians(destination.lat);
    const lon2 = toRadians(destination.lng);

    const deltaLat = lat2 - lat1;
    const deltaLon = lon2 - lon1;

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

export function estimateFare(
    pickup: Location,
    destination: Location,
    surgeMultiplier: number = 1.0
): number {
    const distance = calculateDistance(pickup, destination);

    const fare = (BASE_FARE + distance * PER_KM_RATE) * surgeMultiplier;

    return Number(fare.toFixed(2));
}