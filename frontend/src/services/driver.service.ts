import { api } from "../api/api";

import type { Ride } from "../types/ride";

export interface DriverEarnings {
    completedTrips: number;
    totalEarnings: number;
}

export async function updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number
): Promise<void> {
    await api.post(
        `/drivers/${driverId}/location`,
        {
            lat,
            lng,
        }
    );
}

export async function acceptRide(
    driverId: string,
    rideId: string
): Promise<Ride> {
    const response = await api.post(
        `/drivers/${driverId}/accept`,
        {
            rideId,
        }
    );

    return response.data.data;
}

export async function endTrip(
    rideId: string
): Promise<Ride> {
    const response = await api.post(
        `/trips/${rideId}/end`,
        {}
    );

    return response.data.data;
}

export async function getDriverEarnings(
    driverId: string
): Promise<DriverEarnings> {
    const response = await api.get(
        `/drivers/${driverId}/earnings`
    );

    return response.data.data;
}