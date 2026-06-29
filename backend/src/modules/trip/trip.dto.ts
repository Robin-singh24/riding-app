import { Ride } from "@prisma/client";

export interface StartTripDto {
    tripId: string;
}

export interface EndTripDto {
    tripId: string;
}

export interface TripResponseDto {
    ride: Ride;
}