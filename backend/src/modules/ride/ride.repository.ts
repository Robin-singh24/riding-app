import {
    Prisma,
    PrismaClient,
    Ride,
    RideStatus,
    User,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { CreateRideData } from "./ride.dto";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class RideRepository {
    async findByIdempotencyKey(
        idempotencyKey: string,
        db: DbClient = prisma
    ): Promise<Ride | null> {
        return db.ride.findUnique({
            where: {
                idempotencyKey,
            },
        });
    }

    async findRiderById(
        riderId: string,
        db: DbClient = prisma
    ): Promise<User | null> {
        return db.user.findUnique({
            where: {
                id: riderId,
            },
        });
    }

    async createRide(
        data: CreateRideData,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.create({
            data: {
                rider: {
                    connect: {
                        id: data.riderId,
                    },
                },

                pickupLat: data.pickupLat,
                pickupLng: data.pickupLng,

                destinationLat: data.destinationLat,
                destinationLng: data.destinationLng,

                fare: data.fare,

                surgeMultiplier: data.surgeMultiplier,

                status: data.status,

                idempotencyKey: data.idempotencyKey,

                // payment: {
                //     create: {
                //         amount: data.fare,
                //         paymentMethod: data.paymentMethod,
                //     },
                // },
            },
        });
    }

    async assignDriver(
        rideId: string,
        driverId: string,
        db: DbClient = prisma
    ): Promise<Ride> {
        return db.ride.update({
            where: {
                id: rideId,
            },
            data: {
                driver: {
                    connect: {
                        id: driverId,
                    },
                },
                status: RideStatus.ASSIGNED,
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
}