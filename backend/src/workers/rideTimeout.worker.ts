import { RideStatus } from "@prisma/client";

import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import {
    getExpiredPendingRides,
    removePendingRide,
} from "../config/redis";
import { notifyRideCancelled } from "../socket";

const POLL_INTERVAL_MS = 10_000;

async function cancelExpiredRides(): Promise<void> {
    const expiredRideIds = await getExpiredPendingRides();

    if (expiredRideIds.length === 0) return;

    logger.info(
        `Ride timeout worker: found ${expiredRideIds.length} expired ride(s)`
    );

    for (const rideId of expiredRideIds) {
        try {
            const ride = await prisma.ride.findUnique({
                where: { id: rideId },
            });

            if (!ride) {
                await removePendingRide(rideId);
                continue;
            }

            if (ride.status !== RideStatus.SEARCHING) {
                // Already accepted or cancelled — just clean up Redis
                await removePendingRide(rideId);
                continue;
            }

            await prisma.ride.update({
                where: {
                    id: rideId,
                    status: RideStatus.SEARCHING,
                },
                data: {
                    status: RideStatus.CANCELLED,
                },
            });

            await removePendingRide(rideId);

            notifyRideCancelled(ride.riderId, {
                ...ride,
                status: RideStatus.CANCELLED,
            });

            logger.info(`Ride ${rideId} cancelled due to timeout`);
        } catch (err) {
            logger.error(
                { rideId, err },
                "Failed to cancel timed-out ride"
            );
        }
    }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startRideTimeoutWorker(): void {
    if (intervalHandle) return;

    logger.info("Ride timeout worker started");

    intervalHandle = setInterval(() => {
        void cancelExpiredRides();
    }, POLL_INTERVAL_MS);
}

export function stopRideTimeoutWorker(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        logger.info("Ride timeout worker stopped");
    }
}