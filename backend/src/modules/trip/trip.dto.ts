import { Ride } from "@prisma/client";

export interface EndTripDto {
    tripId: string;
}

export interface TripResponseDto {
    ride: Ride;
}