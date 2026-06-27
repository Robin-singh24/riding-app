import { api } from "../api/api";
import type { Ride } from "../types/ride";

export interface CreateRideRequest {
    riderId: string;

    pickup: {
        lat: number;
        lng: number;
    };

    destination: {
        lat: number;
        lng: number;
    };

    paymentMethod: "UPI";

    idempotencyKey: string;
}

export async function createRide(
    payload: CreateRideRequest
): Promise<Ride> {

    const response = await api.post(
        "/rides",
        {
            riderId: payload.riderId,

            pickup: payload.pickup,

            destination: payload.destination,

            paymentMethod: payload.paymentMethod,
        },
        {
            headers: {
                "idempotency-key":
                    payload.idempotencyKey,
            },
        }
    );

    return response.data.data;
}