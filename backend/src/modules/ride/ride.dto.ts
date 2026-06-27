import { PaymentMethod, RideStatus } from "@prisma/client";

export interface Location {
    lat: number;
    lng: number;
}

export interface CreateRideDto {
    riderId: string;
    pickup: Location;
    destination: Location;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
}

export interface CreateRideData {
    riderId: string;

    pickupLat: number;
    pickupLng: number;

    destinationLat: number;
    destinationLng: number;

    fare: number;

    paymentMethod: PaymentMethod;

    idempotencyKey: string;

    status: RideStatus;
}