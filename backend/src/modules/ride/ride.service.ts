import { Prisma, Ride, RideStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import { estimateFare } from "./fareCalculator";
import { CreateRideData, CreateRideDto } from "./ride.dto";
import { RideRepository } from "./ride.repository";

export class RideService {
    constructor(
        private readonly rideRepository: RideRepository
    ) {}

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

        // Calculate Fare
        const fare = estimateFare(
            dto.pickup,
            dto.destination
        );

        const rideData: CreateRideData = {
            riderId: dto.riderId,

            pickupLat: dto.pickup.lat,
            pickupLng: dto.pickup.lng,

            destinationLat: dto.destination.lat,
            destinationLng: dto.destination.lng,

            fare,

            paymentMethod: dto.paymentMethod,

            idempotencyKey: dto.idempotencyKey,

            status: RideStatus.SEARCHING,
        };

        // Transaction
        const ride = await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                return this.rideRepository.createRide(
                    rideData,
                    tx
                );
            }
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