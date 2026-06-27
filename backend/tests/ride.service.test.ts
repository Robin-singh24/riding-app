import { RideStatus } from "@prisma/client";

describe("RideService", () => {

    it("should create a ride in SEARCHING state", async () => {

        const ride = {
            id: "ride-1",
            riderId: "rider-1",
            status: RideStatus.SEARCHING,
            fare: "180",
        };

        expect(ride.status).toBe(RideStatus.SEARCHING);
        expect(ride.fare).toBe("180");
    });

});