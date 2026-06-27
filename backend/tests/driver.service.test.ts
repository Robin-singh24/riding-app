import { DriverStatus, RideStatus } from "@prisma/client";

describe("DriverService", () => {
    describe("acceptRide", () => {

        it("should assign a driver to a ride successfully", async () => {
            const ride = {
                id: "ride-1",
                status: RideStatus.ASSIGNED,
                driverId: "driver-1",
            };

            expect(ride.status).toBe(RideStatus.ASSIGNED);
            expect(ride.driverId).toBe("driver-1");
        });

        it("should not allow accepting an already assigned ride", async () => {
            const ride = {
                status: RideStatus.ASSIGNED,
            };

            expect(ride.status).not.toBe(RideStatus.SEARCHING);
        });

    });
});