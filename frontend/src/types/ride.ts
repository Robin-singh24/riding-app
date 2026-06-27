export interface Ride {
    id: string;

    riderId: string;
    driverId: string | null;

    pickupLat: number;
    pickupLng: number;

    destinationLat: number;
    destinationLng: number;

    fare: string;

    status: string;

    idempotencyKey: string;

    requestedAt: string;

    startedAt: string | null;
    endedAt: string | null;

    createdAt: string;
    updatedAt: string;
}