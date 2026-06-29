import {
    DriverStatus,
    PaymentMethod,
    Prisma,
    RideStatus,
    Role,
} from "@prisma/client";

import { RideService } from "../src/modules/ride/ride.service";
import { RideRepository } from "../src/modules/ride/ride.repository";
import { ApiError } from "../src/utils/ApiError";
import type { CreateRideDto } from "../src/modules/ride/ride.dto";

// Mock redis (findNearbyDrivers)
jest.mock("../src/config/redis", () => ({
    findNearbyDrivers: jest.fn(),
    trackPendingRide: jest.fn(),
    updateDriverLocation: jest.fn(),
    removeDriverLocation: jest.fn(),
}));

// Mock socket notifications
jest.mock("../src/socket", () => ({
    notifyRideRequested: jest.fn(),
    notifyRideAssigned: jest.fn(),
}));

// Mock prisma.$transaction to just execute the callback
jest.mock("../src/config/prisma", () => ({
    prisma: {
        $transaction: jest.fn(
            (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
                fn({} as Prisma.TransactionClient)
        ),
    },
}));

// Mock surge calculator
jest.mock("../src/modules/ride/surgeCalculator", () => ({
    getSurgeMultiplier: jest.fn().mockResolvedValue(1.0),
}));

import { findNearbyDrivers } from "../src/config/redis";
import { notifyRideRequested } from "../src/socket";

const mockedFindNearbyDrivers = findNearbyDrivers as jest.MockedFunction<
    typeof findNearbyDrivers
>;

describe("RideService", () => {
    let rideService: RideService;
    let rideRepository: jest.Mocked<RideRepository>;

    const mockRider = {
        id: "rider-1",
        fullName: "Test Rider",
        email: "rider@test.com",
        password: "hashed",
        role: Role.RIDER,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const baseRideDto: CreateRideDto = {
        riderId: "rider-1",
        pickup: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6245 },
        paymentMethod: PaymentMethod.UPI,
        idempotencyKey: "idem-key-123",
    };

    const mockRide = {
        id: "ride-1",
        riderId: "rider-1",
        driverId: null,
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        fare: new Prisma.Decimal(180),
        surgeMultiplier: 1.0,
        status: RideStatus.SEARCHING,
        idempotencyKey: "idem-key-123",
        requestedAt: new Date(),
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        rideRepository = {
            findByIdempotencyKey: jest.fn(),
            findRiderById: jest.fn(),
            createRide: jest.fn(),
            assignDriver: jest.fn(),
            findRideById: jest.fn(),
        } as unknown as jest.Mocked<RideRepository>;

        rideService = new RideService(rideRepository);

        jest.clearAllMocks();
    });

    describe("createRide", () => {
        it("should return existing ride for duplicate idempotency key", async () => {
            rideRepository.findByIdempotencyKey.mockResolvedValue(mockRide);

            const result = await rideService.createRide(baseRideDto);

            expect(result).toBe(mockRide);
            expect(rideRepository.findByIdempotencyKey).toHaveBeenCalledWith(
                "idem-key-123"
            );
            expect(rideRepository.createRide).not.toHaveBeenCalled();
        });

        it("should throw 404 if rider does not exist", async () => {
            rideRepository.findByIdempotencyKey.mockResolvedValue(null);
            rideRepository.findRiderById.mockResolvedValue(null);

            await expect(
                rideService.createRide(baseRideDto)
            ).rejects.toThrow(ApiError);

            await expect(
                rideService.createRide(baseRideDto)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Rider not found",
            });
        });

        it("should throw 404 if no nearby drivers are available", async () => {
            rideRepository.findByIdempotencyKey.mockResolvedValue(null);
            rideRepository.findRiderById.mockResolvedValue(mockRider);
            mockedFindNearbyDrivers.mockResolvedValue([]);

            await expect(
                rideService.createRide(baseRideDto)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "No nearby drivers found",
            });
        });

        it("should create ride and notify up to 3 nearby drivers", async () => {
            rideRepository.findByIdempotencyKey.mockResolvedValue(null);
            rideRepository.findRiderById.mockResolvedValue(mockRider);
            rideRepository.createRide.mockResolvedValue(mockRide);

            mockedFindNearbyDrivers.mockResolvedValue([
                { driverId: "driver-1", distance: 1.2 },
                { driverId: "driver-2", distance: 2.5 },
                { driverId: "driver-3", distance: 3.0 },
                { driverId: "driver-4", distance: 4.8 },
            ]);

            const result = await rideService.createRide(baseRideDto);

            expect(result).toBe(mockRide);
            expect(rideRepository.createRide).toHaveBeenCalled();

            // Should notify at most 3 drivers, not all 4
            expect(notifyRideRequested).toHaveBeenCalledTimes(3);
            expect(notifyRideRequested).toHaveBeenCalledWith("driver-1", mockRide);
            expect(notifyRideRequested).toHaveBeenCalledWith("driver-2", mockRide);
            expect(notifyRideRequested).toHaveBeenCalledWith("driver-3", mockRide);
        });

        it("should create ride in SEARCHING status with calculated fare", async () => {
            rideRepository.findByIdempotencyKey.mockResolvedValue(null);
            rideRepository.findRiderById.mockResolvedValue(mockRider);
            rideRepository.createRide.mockResolvedValue(mockRide);

            mockedFindNearbyDrivers.mockResolvedValue([
                { driverId: "driver-1", distance: 1.0 },
            ]);

            await rideService.createRide(baseRideDto);

            const createCall = rideRepository.createRide.mock.calls[0][0];
            expect(createCall.status).toBe(RideStatus.SEARCHING);
            expect(createCall.fare).toBeGreaterThan(0);
            expect(createCall.riderId).toBe("rider-1");
        });
    });

    describe("getRideById", () => {
        it("should return ride when found", async () => {
            rideRepository.findRideById.mockResolvedValue(mockRide);

            const result = await rideService.getRideById("ride-1");

            expect(result).toBe(mockRide);
        });

        it("should throw 404 when ride not found", async () => {
            rideRepository.findRideById.mockResolvedValue(null);

            await expect(
                rideService.getRideById("nonexistent")
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Ride not found",
            });
        });
    });
});