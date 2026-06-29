import {
    DriverStatus,
    Prisma,
    RideStatus,
    Role,
} from "@prisma/client";

import { TripService } from "../src/modules/trip/trip.service";
import { TripRepository } from "../src/modules/trip/trip.repository";
import { ApiError } from "../src/utils/ApiError";

// Mock socket notifications
jest.mock("../src/socket", () => ({
    notifyTripEnded: jest.fn(),
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

import { notifyTripEnded } from "../src/socket";

describe("TripService", () => {
    let tripService: TripService;
    let tripRepository: jest.Mocked<TripRepository>;

    const mockAssignedRide = {
        id: "ride-1",
        riderId: "rider-1",
        driverId: "driver-1",
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        fare: new Prisma.Decimal(180),
        status: RideStatus.ASSIGNED,
        idempotencyKey: "key-1",
        requestedAt: new Date(),
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockCompletedRide = {
        ...mockAssignedRide,
        status: RideStatus.COMPLETED,
        endedAt: new Date(),
    };

    const mockDriver = {
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
            status: DriverStatus.ON_TRIP,
            rating: new Prisma.Decimal(4.5),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    };

    beforeEach(() => {
        tripRepository = {
            findRideById: jest.fn(),
            findDriverById: jest.fn(),
            completeRide: jest.fn(),
            updateDriverStatus: jest.fn(),
        } as unknown as jest.Mocked<TripRepository>;

        tripService = new TripService(tripRepository);

        jest.clearAllMocks();
    });

    describe("endTrip", () => {
        it("should complete a trip and notify the rider", async () => {
            tripRepository.findRideById.mockResolvedValue(mockAssignedRide);
            tripRepository.findDriverById.mockResolvedValue(mockDriver);
            tripRepository.completeRide.mockResolvedValue(mockCompletedRide);

            const result = await tripService.endTrip({ tripId: "ride-1" });

            expect(result.status).toBe(RideStatus.COMPLETED);
            expect(tripRepository.completeRide).toHaveBeenCalled();
            expect(tripRepository.updateDriverStatus).toHaveBeenCalledWith(
                "driver-1",
                DriverStatus.ONLINE,
                expect.anything()
            );
            expect(notifyTripEnded).toHaveBeenCalledWith(
                "rider-1",
                mockCompletedRide
            );
        });

        it("should throw 404 if trip does not exist", async () => {
            tripRepository.findRideById.mockResolvedValue(null);

            await expect(
                tripService.endTrip({ tripId: "nonexistent" })
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Trip not found",
            });
        });

        it("should throw 400 if trip is not in ASSIGNED status", async () => {
            const searchingRide = {
                ...mockAssignedRide,
                status: RideStatus.SEARCHING,
            };
            tripRepository.findRideById.mockResolvedValue(searchingRide);

            await expect(
                tripService.endTrip({ tripId: "ride-1" })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Trip cannot be ended",
            });
        });

        it("should throw 400 if ride has no driver assigned", async () => {
            const noDriverRide = {
                ...mockAssignedRide,
                driverId: null,
            };
            tripRepository.findRideById.mockResolvedValue(noDriverRide);

            await expect(
                tripService.endTrip({ tripId: "ride-1" })
            ).rejects.toMatchObject({
                statusCode: 400,
            });
        });

        it("should recalculate fare on trip completion", async () => {
            tripRepository.findRideById.mockResolvedValue(mockAssignedRide);
            tripRepository.findDriverById.mockResolvedValue(mockDriver);
            tripRepository.completeRide.mockResolvedValue(mockCompletedRide);

            await tripService.endTrip({ tripId: "ride-1" });

            // Verify completeRide was called with a recalculated fare
            const [rideId, fare] = tripRepository.completeRide.mock.calls[0];
            expect(rideId).toBe("ride-1");
            expect(typeof fare).toBe("number");
            expect(fare).toBeGreaterThan(0);
        });
    });
});
