import { Prisma, Ride, RideStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import { estimateFare } from "./fareCalculator";
import { getSurgeMultiplier } from "./surgeCalculator";
import { CreateRideData, CreateRideDto } from "./ride.dto";
import { RideRepository } from "./ride.repository";
import { findNearbyDrivers, trackPendingRide } from "../../config/redis";
import { notifyRideRequested } from "../../socket";

export class RideService {
    constructor(
        private readonly rideRepository: RideRepository
    ) { }

    async createRide(dto: CreateRideDto): Promise<Ride> {
        // Idempotency Check
        const existingRide =
            await this.rideRepository.findByIdempotencyKey(
                dto.idempotencyKey
            );

        if (existingRide) {
            return existingRide;
        }

        // Validate Rider
        const rider =
            await this.rideRepository.findRiderById(
                dto.riderId
            );

        if (!rider) {
            throw new ApiError(404, "Rider not found");
        }

        // Surge Pricing
        const surgeMultiplier = await getSurgeMultiplier();

        // Calculate Fare
        const fare = estimateFare(
            dto.pickup,
            dto.destination,
            surgeMultiplier
        );

        const rideData: CreateRideData = {
            riderId: dto.riderId,

            pickupLat: dto.pickup.lat,
            pickupLng: dto.pickup.lng,

            destinationLat: dto.destination.lat,
            destinationLng: dto.destination.lng,

            fare,

            surgeMultiplier,

            paymentMethod: dto.paymentMethod,

            idempotencyKey: dto.idempotencyKey,

            status: RideStatus.SEARCHING,
        };

        console.log("Pickup DTO:", dto.pickup);
        const nearbyDrivers =
            await findNearbyDrivers(
                dto.pickup.lat,
                dto.pickup.lng,
                50
            );

        console.log(
            "Nearby drivers:",
            nearbyDrivers
        );
        if (nearbyDrivers.length === 0) {
            throw new ApiError(
                404,
                "No nearby drivers found"
            );
        }

        console.log("Nearby drivers:", nearbyDrivers);

        // Transaction
        const ride = await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                return this.rideRepository.createRide(
                    rideData,
                    tx
                );
            }
        );

        const driversToNotify = nearbyDrivers.slice(0, 3);

        for (const driver of driversToNotify) {
            notifyRideRequested(driver.driverId, ride);
        }

        // Track for timeout expiry and decline handling
        await trackPendingRide(
            ride.id,
            driversToNotify.map((d) => d.driverId)
        );

        return ride;
    }

    async getRideById(
        rideId: string
    ): Promise<Ride> {
        const ride =
            await this.rideRepository.findRideById(
                rideId
            );

        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        return ride;
    }
}