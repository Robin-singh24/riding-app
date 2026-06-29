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

export class TripRepository {
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

    async startRide(
        rideId: string,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.update({
            where: {
                id: rideId,
                status: RideStatus.ASSIGNED,
            },
            data: {
                status: RideStatus.STARTED,
                startedAt: new Date(),
            },
        });
    }

    async completeRide(
        rideId: string,
        fare: number,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.update({
            where: {
                id: rideId,
            },
            data: {
                status: RideStatus.COMPLETED,
                endedAt: new Date(),
                fare,
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
}