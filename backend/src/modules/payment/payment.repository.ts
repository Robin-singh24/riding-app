import {
    Payment,
    PaymentMethod,
    PaymentStatus,
    Prisma,
    PrismaClient,
    Ride,
    RideStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PaymentRepository {
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

    async findPaymentByRideId(
        rideId: string,
        db: DbClient = prisma
    ): Promise<Payment | null> {
        return db.payment.findUnique({
            where: {
                rideId,
            },
        });
    }

    async createPayment(
        ride: Ride,
        db: DbClient = prisma
    ): Promise<Payment> {
        return db.payment.create({
            data: {
                rideId: ride.id,
                amount: ride.fare,
                paymentMethod: PaymentMethod.UPI,
                status: PaymentStatus.PENDING,
            },
        });
    }

    async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        transactionId: string,
        db: DbClient = prisma
    ): Promise<Payment> {
        return db.payment.update({
            where: {
                id: paymentId,
            },
            data: {
                status,
                transactionId,
            },
        });
    }
}