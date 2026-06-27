import {
    DriverStatus,
    Prisma,
    Ride,
    RideStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";

import {
    removeDriverLocation,
    updateDriverLocation,
} from "../../config/redis";

import { ApiError } from "../../utils/ApiError";

import {
    AcceptRideDto,
    DriverLocationDto,
} from "./driver.dto";

import { DriverRepository } from "./driver.repository";
import { notifyRideAssigned } from "../../socket";


export class DriverService {
    constructor(
        private readonly driverRepository: DriverRepository
    ) { }

    async updateLocation(
        dto: DriverLocationDto
    ): Promise<void> {
        const driver =
            await this.driverRepository.findDriverById(
                dto.driverId
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

        if (
            driver.driverProfile.status ===
            DriverStatus.OFFLINE
        ) {
            throw new ApiError(
                400,
                "Driver is offline"
            );
        }

        await updateDriverLocation(
            dto.driverId,
            dto.lat,
            dto.lng
        );
    }

    async acceptRide(
        dto: AcceptRideDto
    ): Promise<Ride> {
        const driver =
            await this.driverRepository.findDriverById(
                dto.driverId
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

        if (
            driver.driverProfile.status !==
            DriverStatus.ONLINE
        ) {
            throw new ApiError(
                400,
                "Driver is not online"
            );
        }
        const ride =
            await this.driverRepository.findRideById(
                dto.rideId
            );

        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        if (
            ride.status !== RideStatus.SEARCHING
        ) {
            throw new ApiError(
                409,
                "Ride is no longer available"
            );
        }

        await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const assigned =
                    await this.driverRepository.assignDriverToRide(
                        dto.rideId,
                        dto.driverId,
                        tx
                    );

                if (!assigned) {
                    throw new ApiError(
                        409,
                        "Ride already accepted by another driver"
                    );
                }

                await this.driverRepository.updateDriverStatus(
                    dto.driverId,
                    DriverStatus.ON_TRIP,
                    tx
                );
            }
        );

        await removeDriverLocation(dto.driverId);

        const updatedRide =
            await this.driverRepository.findRideById(
                dto.rideId
            );

        if (!updatedRide) {
            throw new ApiError(
                500,
                "Unable to fetch updated ride"
            );
        }
        notifyRideAssigned(
            updatedRide.riderId,
            updatedRide
        );

        return updatedRide;
    }


    async getDriverEarnings(
        driverId: string
    ): Promise<{
        completedTrips: number;
        totalEarnings: number;
    }> {
        const driver =
            await this.driverRepository.findDriverById(
                driverId
            );

        if (!driver) {
            throw new ApiError(
                404,
                "Driver not found"
            );
        }

        if (!driver.driverProfile) {
            throw new ApiError(
                404,
                "Driver profile not found"
            );
        }

        return this.driverRepository.getDriverEarnings(
            driverId
        );
    }
}