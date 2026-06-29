import {
    DriverStatus,
    Prisma,
    Ride,
    RideStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import { estimateFare } from "../ride/fareCalculator";
import { EndTripDto } from "./trip.dto";
import { TripRepository } from "./trip.repository";
import { notifyTripEnded } from "../../socket";

export class TripService {
    constructor(
        private readonly tripRepository: TripRepository
    ) { }

    async endTrip(dto: EndTripDto): Promise<Ride> {
        const ride = await this.tripRepository.findRideById(
            dto.tripId
        );

        if (!ride) {
            throw new ApiError(404, "Trip not found");
        }

        if (ride.status !== RideStatus.ASSIGNED) {
            throw new ApiError(
                400,
                "Trip cannot be ended"
            );
        }

        if (!ride.driverId) {
            throw new ApiError(
                400,
                "No driver assigned to this trip"
            );
        }

        const driver =
            await this.tripRepository.findDriverById(
                ride.driverId
            );

        if (!driver) {
            throw new ApiError(404, "Driver not found");
        }

        if (!driver.driverProfile) {
            throw new ApiError(
                404,
                "Driver profile not found"
            );
        }

        const finalFare = estimateFare(
            {
                lat: ride.pickupLat,
                lng: ride.pickupLng,
            },
            {
                lat: ride.destinationLat,
                lng: ride.destinationLng,
            },
            ride.surgeMultiplier
        );

        let completedRide: Ride;

        await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                completedRide =
                    await this.tripRepository.completeRide(
                        ride.id,
                        finalFare,
                        tx
                    );

                await this.tripRepository.updateDriverStatus(
                    ride.driverId!,
                    DriverStatus.ONLINE,
                    tx
                );
            }
        );

        notifyTripEnded(
            completedRide!.riderId,
            completedRide!
        );

        return completedRide!;
    }
}