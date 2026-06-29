import { Ride } from "@prisma/client";

export interface DriverLocationDto {
    driverId: string;

    lat: number;
    lng: number;
}

export interface AcceptRideDto {
    driverId: string;

    rideId: string;
}

export interface DeclineRideDto {
    driverId: string;

    rideId: string;
}

export interface UpdateDriverLocationRequest {
    lat: number;
    lng: number;
}

export interface AcceptRideRequest {
    rideId: string;
}

export interface DeclineRideRequest {
    rideId: string;
}

export interface NearbyDriver {
    driverId: string;
    distance: number;
}

export interface DriverAssignmentResult {
    ride: Ride;
    driverId: string;
}