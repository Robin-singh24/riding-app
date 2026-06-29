import {
    PaymentMethod,
    PaymentStatus,
    Prisma,
    RideStatus,
} from "@prisma/client";

import { PaymentService } from "../src/modules/payment/payment.service";
import { PaymentRepository } from "../src/modules/payment/payment.repository";
import { ApiError } from "../src/utils/ApiError";

// Mock PSP factory
jest.mock("../src/psp/pspFactory", () => ({
    PspFactory: {
        getProvider: jest.fn(() => ({
            processPayment: jest.fn().mockResolvedValue({
                success: true,
                transactionId: "MOCK_TXN_abc123",
                message: "Payment processed successfully",
            }),
        })),
    },
}));

// Mock socket notifications
jest.mock("../src/socket", () => ({
    notifyPaymentCompleted: jest.fn(),
}));

// Mock prisma.$transaction
jest.mock("../src/config/prisma", () => ({
    prisma: {
        $transaction: jest.fn(
            (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
                fn({} as Prisma.TransactionClient)
        ),
    },
}));

import { notifyPaymentCompleted } from "../src/socket";

describe("PaymentService", () => {
    let paymentService: PaymentService;
    let paymentRepository: jest.Mocked<PaymentRepository>;

    const mockCompletedRide = {
        id: "ride-1",
        riderId: "rider-1",
        driverId: "driver-1",
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        fare: new Prisma.Decimal(250),
        surgeMultiplier: 1.0,
        status: RideStatus.COMPLETED,
        idempotencyKey: "key-1",
        requestedAt: new Date(),
        startedAt: new Date(),
        endedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPayment = {
        id: "payment-1",
        rideId: "ride-1",
        amount: new Prisma.Decimal(250),
        paymentMethod: PaymentMethod.UPI,
        status: PaymentStatus.SUCCESS,
        transactionId: "MOCK_TXN_abc123",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        paymentRepository = {
            findRideById: jest.fn(),
            findPaymentByRideId: jest.fn(),
            createPayment: jest.fn(),
            updatePaymentStatus: jest.fn(),
        } as unknown as jest.Mocked<PaymentRepository>;

        paymentService = new PaymentService(paymentRepository);

        jest.clearAllMocks();
    });

    describe("createPayment", () => {
        it("should process payment for a completed ride", async () => {
            paymentRepository.findRideById.mockResolvedValue(mockCompletedRide);
            paymentRepository.findPaymentByRideId.mockResolvedValue(null);
            paymentRepository.createPayment.mockResolvedValue({
                ...mockPayment,
                status: PaymentStatus.PENDING,
                transactionId: null,
            });
            paymentRepository.updatePaymentStatus.mockResolvedValue(mockPayment);

            const result = await paymentService.createPayment({
                rideId: "ride-1",
            });

            expect(paymentRepository.createPayment).toHaveBeenCalledWith(
                mockCompletedRide
            );
            expect(notifyPaymentCompleted).toHaveBeenCalledWith(
                "rider-1",
                expect.anything()
            );
        });

        it("should return existing payment for idempotent calls", async () => {
            paymentRepository.findRideById.mockResolvedValue(mockCompletedRide);
            paymentRepository.findPaymentByRideId.mockResolvedValue(mockPayment);

            const result = await paymentService.createPayment({
                rideId: "ride-1",
            });

            expect(result).toBe(mockPayment);
            expect(paymentRepository.createPayment).not.toHaveBeenCalled();
        });

        it("should throw 404 if ride does not exist", async () => {
            paymentRepository.findRideById.mockResolvedValue(null);

            await expect(
                paymentService.createPayment({ rideId: "nonexistent" })
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Ride not found",
            });
        });

        it("should throw 400 if ride is not completed", async () => {
            const ongoingRide = {
                ...mockCompletedRide,
                status: RideStatus.ASSIGNED,
            };
            paymentRepository.findRideById.mockResolvedValue(ongoingRide);

            await expect(
                paymentService.createPayment({ rideId: "ride-1" })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Payment can only be made for completed trips",
            });
        });
    });
});