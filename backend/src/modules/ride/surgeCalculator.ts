import { RideStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { getAvailableDriverCount } from "../../config/redis";

const SURGE_TIERS = [
    { maxRatio: 0.5, multiplier: 1.0 },
    { maxRatio: 1.0, multiplier: 1.25 },
    { maxRatio: 1.5, multiplier: 1.5 },
    { maxRatio: 2.0, multiplier: 2.0 },
    { maxRatio: Infinity, multiplier: 2.5 },
];

export async function getSurgeMultiplier(): Promise<number> {
    const [activeRides, availableDrivers] = await Promise.all([
        prisma.ride.count({
            where: {
                status: {
                    in: [
                        RideStatus.SEARCHING,
                        RideStatus.ASSIGNED,
                        RideStatus.STARTED,
                    ],
                },
            },
        }),

        getAvailableDriverCount(),
    ]);

    // Avoid division by zero — if no drivers, apply max surge
    if (availableDrivers === 0) {
        return SURGE_TIERS[SURGE_TIERS.length - 1].multiplier;
    }

    const ratio = activeRides / availableDrivers;

    const tier = SURGE_TIERS.find(
        (t) => ratio < t.maxRatio
    );

    return tier?.multiplier ?? 1.0;
}
