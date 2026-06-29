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
    removePendingRide,
    getNotifiedDrivers,
    updateNotifiedDrivers,
} from "../../config/redis";

import { ApiError } from "../../utils/ApiError";

import {
    AcceptRideDto,
    DeclineRideDto,
    DriverLocationDto,
} from "./driver.dto";

import { DriverRepository } from "./driver.repository";
import { notifyRideAssigned, notifyRideCancelled } from "../../socket";


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

        // Ride accepted — stop timeout tracking
        await removePendingRide(dto.rideId);

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

    async declineRide(
        dto: DeclineRideDto
    ): Promise<void> {
        const ride =
            await this.driverRepository.findRideById(
                dto.rideId
            );

        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        // Already accepted or cancelled — silently succeed (idempotent)
        if (ride.status !== RideStatus.SEARCHING) {
            return;
        }

        const notifiedDrivers = await getNotifiedDrivers(dto.rideId);

        if (!notifiedDrivers.includes(dto.driverId)) {
            throw new ApiError(
                403,
                "Driver was not offered this ride"
            );
        }

        // Remove this driver from the notified list
        const remaining = notifiedDrivers.filter(
            (id) => id !== dto.driverId
        );

        if (remaining.length === 0) {
            // All notified drivers declined — cancel ride immediately
            await this.driverRepository.cancelRide(dto.rideId);
            await removePendingRide(dto.rideId);
            notifyRideCancelled(ride.riderId, {
                ...ride,
                status: RideStatus.CANCELLED,
            });
        } else {
            // Update the remaining list so future declines are tracked
            await updateNotifiedDrivers(dto.rideId, remaining);
        }
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