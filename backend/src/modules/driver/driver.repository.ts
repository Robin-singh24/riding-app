import {
    DriverProfile,
    DriverStatus,
    Prisma,
    PrismaClient,
    Ride,
    RideStatus,
    User,
} from "@prisma/client";

import { prisma } from "../../config/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class DriverRepository {
    async findDriverById(
        driverId: string,
        db: DbClient = prisma
    ): Promise<
        (User & {
            driverProfile: DriverProfile | null;
        }) | null
    > {
        return db.user.findUnique({
            where: {
                id: driverId,
            },
            include: {
                driverProfile: true,
            },
        });
    }

    async findRideById(
        rideId: string,
        db: DbClient = prisma
    ): Promise<Ride | null> {
        return db.ride.findUnique({
            where: {
                id: rideId,
            },
        });
    }

    async updateDriverStatus(
        driverId: string,
        status: DriverStatus,
        db: DbClient = prisma
    ): Promise<DriverProfile> {
        return db.driverProfile.update({
            where: {
                userId: driverId,
            },
            data: {
                status,
            },
        });
    }

    async assignDriverToRide(
        rideId: string,
        driverId: string,
        db: DbClient = prisma
    ): Promise<boolean> {
        const result = await db.ride.updateMany({
            where: {
                id: rideId,
                status: RideStatus.SEARCHING,
                driverId: null,
            },
            data: {
                driverId,
                status: RideStatus.ASSIGNED,
            },
        });

        return result.count === 1;
    }

    async updateRideStatus(
        rideId: string,
        status: RideStatus,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.update({
            where: {
                id: rideId,
            },
            data: {
                status,
            },
        });
    }
    async getDriverEarnings(
        driverId: string,
        db: DbClient = prisma
    ): Promise<{
        completedTrips: number;
        totalEarnings: number;
    }> {
        const rides = await db.ride.findMany({
            where: {
                driverId,
                status: RideStatus.COMPLETED,
            },
            select: {
                fare: true,
            },
        });

        const completedTrips = rides.length;

        const totalEarnings = rides.reduce(
            (sum, ride) => sum + Number(ride.fare),
            0
        );

        return {
            completedTrips,
            totalEarnings: Number(totalEarnings.toFixed(2)),
        };
    }

    async cancelRide(
        rideId: string,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.update({
            where: {
                id: rideId,
                status: RideStatus.SEARCHING,
            },
            data: {
                status: RideStatus.CANCELLED,
            },
        });
    }
}