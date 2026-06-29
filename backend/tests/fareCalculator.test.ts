import { estimateFare } from "../src/modules/ride/fareCalculator";

describe("FareCalculator", () => {
    const BASE_FARE = 50;
    const PER_KM_RATE = 12;

    it("should return base fare for same pickup and destination", () => {
        const pickup = { lat: 12.9716, lng: 77.5946 };
        const destination = { lat: 12.9716, lng: 77.5946 };

        const fare = estimateFare(pickup, destination);

        expect(fare).toBe(BASE_FARE);
    });

    it("should calculate fare correctly for a known distance", () => {
        // Bangalore MG Road to Whitefield (~16 km)
        const pickup = { lat: 12.9716, lng: 77.5946 };
        const destination = { lat: 12.9698, lng: 77.7500 };

        const fare = estimateFare(pickup, destination);

        // Distance ~17.2 km → fare = 50 + 17.2 * 12 ≈ 256
        expect(fare).toBeGreaterThan(BASE_FARE);
        expect(fare).toBeGreaterThan(200);
        expect(fare).toBeLessThan(300);
    });

    it("should increase fare proportionally with distance", () => {
        const pickup = { lat: 12.9716, lng: 77.5946 };
        const nearDestination = { lat: 12.98, lng: 77.60 };
        const farDestination = { lat: 13.05, lng: 77.70 };

        const nearFare = estimateFare(pickup, nearDestination);
        const farFare = estimateFare(pickup, farDestination);

        expect(farFare).toBeGreaterThan(nearFare);
    });

    it("should return a number with at most 2 decimal places", () => {
        const pickup = { lat: 12.9716, lng: 77.5946 };
        const destination = { lat: 12.9352, lng: 77.6245 };

        const fare = estimateFare(pickup, destination);
        const decimalPlaces = (fare.toString().split(".")[1] || "").length;

        expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it("should handle cross-hemisphere coordinates", () => {
        const pickup = { lat: -33.8688, lng: 151.2093 }; // Sydney
        const destination = { lat: 51.5074, lng: -0.1278 }; // London

        const fare = estimateFare(pickup, destination);

        // ~17,000 km → very large fare
        expect(fare).toBeGreaterThan(100000);
    });
});
