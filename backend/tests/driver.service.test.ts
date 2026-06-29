import {
    DriverStatus,
    Prisma,
    RideStatus,
    Role,
} from "@prisma/client";

import { DriverService } from "../src/modules/driver/driver.service";
import { DriverRepository } from "../src/modules/driver/driver.repository";
import { ApiError } from "../src/utils/ApiError";

// Mock redis
jest.mock("../src/config/redis", () => ({
    updateDriverLocation: jest.fn(),
    removeDriverLocation: jest.fn(),
}));

// Mock socket notifications
jest.mock("../src/socket", () => ({
    notifyRideAssigned: jest.fn(),
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

import { updateDriverLocation, removeDriverLocation } from "../src/config/redis";
import { notifyRideAssigned } from "../src/socket";

describe("DriverService", () => {
    let driverService: DriverService;
    let driverRepository: jest.Mocked<DriverRepository>;

    const mockOnlineDriver = {
        id: "driver-1",
        fullName: "Test Driver",
        email: "driver@test.com",
        password: "hashed",
        role: Role.DRIVER,
        createdAt: new Date(),
        updatedAt: new Date(),
        driverProfile: {
            userId: "driver-1",
            vehicleNumber: "KA01AB1234",
            vehicleType: "Sedan",
            licenseNumber: "DL123456789",
            status: DriverStatus.ONLINE,
            rating: new Prisma.Decimal(4.5),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    };

    const mockOfflineDriver = {
        ...mockOnlineDriver,
        id: "driver-2",
        driverProfile: {
            ...mockOnlineDriver.driverProfile!,
            userId: "driver-2",
            status: DriverStatus.OFFLINE,
        },
    };

    const mockSearchingRide = {
        id: "ride-1",
        riderId: "rider-1",
        driverId: null,
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        fare: new Prisma.Decimal(180),
        status: RideStatus.SEARCHING,
        idempotencyKey: "key-1",
        requestedAt: new Date(),
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockAssignedRide = {
        ...mockSearchingRide,
        driverId: "driver-1",
        status: RideStatus.ASSIGNED,
    };

    beforeEach(() => {
        driverRepository = {
            findDriverById: jest.fn(),
            findRideById: jest.fn(),
            updateDriverStatus: jest.fn(),
            assignDriverToRide: jest.fn(),
            updateRideStatus: jest.fn(),
            getDriverEarnings: jest.fn(),
        } as unknown as jest.Mocked<DriverRepository>;

        driverService = new DriverService(driverRepository);

        jest.clearAllMocks();
    });

    describe("updateLocation", () => {
        it("should update driver location in Redis", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOnlineDriver);

            await driverService.updateLocation({
                driverId: "driver-1",
                lat: 12.97,
                lng: 77.59,
            });

            expect(updateDriverLocation).toHaveBeenCalledWith(
                "driver-1", 12.97, 77.59
            );
        });

        it("should throw 404 if driver does not exist", async () => {
            driverRepository.findDriverById.mockResolvedValue(null);

            await expect(
                driverService.updateLocation({
                    driverId: "nonexistent",
                    lat: 12.97,
                    lng: 77.59,
                })
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Driver not found",
            });
        });

        it("should throw 400 if driver is offline", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOfflineDriver);

            await expect(
                driverService.updateLocation({
                    driverId: "driver-2",
                    lat: 12.97,
                    lng: 77.59,
                })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Driver is offline",
            });
        });
    });

    describe("acceptRide", () => {
        it("should assign driver and remove location from Redis", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOnlineDriver);
            driverRepository.findRideById
                .mockResolvedValueOnce(mockSearchingRide)    // initial check
                .mockResolvedValueOnce(mockAssignedRide);    // after assignment
            driverRepository.assignDriverToRide.mockResolvedValue(true);

            const result = await driverService.acceptRide({
                driverId: "driver-1",
                rideId: "ride-1",
            });

            expect(result.status).toBe(RideStatus.ASSIGNED);
            expect(removeDriverLocation).toHaveBeenCalledWith("driver-1");
            expect(notifyRideAssigned).toHaveBeenCalledWith(
                "rider-1",
                mockAssignedRide
            );
        });

        it("should throw 409 if ride is no longer in SEARCHING status", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOnlineDriver);
            driverRepository.findRideById.mockResolvedValue(mockAssignedRide);

            await expect(
                driverService.acceptRide({
                    driverId: "driver-1",
                    rideId: "ride-1",
                })
            ).rejects.toMatchObject({
                statusCode: 409,
                message: "Ride is no longer available",
            });
        });

        it("should throw 409 if another driver already accepted the ride", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOnlineDriver);
            driverRepository.findRideById.mockResolvedValue(mockSearchingRide);
            driverRepository.assignDriverToRide.mockResolvedValue(false);

            await expect(
                driverService.acceptRide({
                    driverId: "driver-1",
                    rideId: "ride-1",
                })
            ).rejects.toMatchObject({
                statusCode: 409,
            });
        });

        it("should throw 400 if driver is not online", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOfflineDriver);

            await expect(
                driverService.acceptRide({
                    driverId: "driver-2",
                    rideId: "ride-1",
                })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Driver is not online",
            });
        });
    });

    describe("getDriverEarnings", () => {
        it("should return earnings for a valid driver", async () => {
            driverRepository.findDriverById.mockResolvedValue(mockOnlineDriver);
            driverRepository.getDriverEarnings.mockResolvedValue({
                completedTrips: 5,
                totalEarnings: 1250.50,
            });

            const earnings = await driverService.getDriverEarnings("driver-1");

            expect(earnings.completedTrips).toBe(5);
            expect(earnings.totalEarnings).toBe(1250.50);
        });

        it("should throw 404 for non-existent driver", async () => {
            driverRepository.findDriverById.mockResolvedValue(null);

            await expect(
                driverService.getDriverEarnings("nonexistent")
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Driver not found",
            });
        });
    });
});