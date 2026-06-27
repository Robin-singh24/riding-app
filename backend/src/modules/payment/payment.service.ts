import {
    Payment,
    PaymentStatus,
    Prisma,
    RideStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import { PspFactory } from "../../psp/pspFactory";

import { CreatePaymentDto } from "./payment.dto";
import { PaymentRepository } from "./payment.repository";
import { notifyPaymentCompleted } from "../../socket";

export class PaymentService {
    constructor(
        private readonly paymentRepository: PaymentRepository
    ) { }

    async createPayment(
        dto: CreatePaymentDto
    ): Promise<Payment> {
        const ride =
            await this.paymentRepository.findRideById(
                dto.rideId
            );

        if (!ride) {
            throw new ApiError(404, "Ride not found");
        }

        if (ride.status !== RideStatus.COMPLETED) {
            throw new ApiError(
                400,
                "Payment can only be made for completed trips"
            );
        }

        const existingPayment =
            await this.paymentRepository.findPaymentByRideId(
                dto.rideId
            );

        if (existingPayment) {
            return existingPayment;
        }

        const payment =
            await this.paymentRepository.createPayment(
                ride
            );

        const provider = PspFactory.getProvider();

        const result =
            await provider.processPayment(
                payment.id,
                Number(payment.amount)
            );

        let updatedPayment: Payment;

        await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                updatedPayment =
                    await this.paymentRepository.updatePaymentStatus(
                        payment.id,
                        result.success
                            ? PaymentStatus.SUCCESS
                            : PaymentStatus.FAILED,
                        result.transactionId ?? "",
                        tx
                    );
            }
        );

        notifyPaymentCompleted(
            ride.riderId,
            updatedPayment!
        );

        return updatedPayment!;
    }
}