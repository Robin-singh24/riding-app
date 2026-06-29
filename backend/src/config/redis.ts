import Redis from "ioredis";

import { env } from "./env";
import { logger } from "./logger";

export const DRIVER_LOCATION_KEY = "drivers:locations";

const globalForRedis = globalThis as {
    redis?: Redis;
};

export const redis =
    globalForRedis.redis ??
    new Redis({
        host: "localhost",
        port: env.REDIS_PORT,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });

if (env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}

redis.on("connect", () => {
    logger.info("Connected to Redis");
});

redis.on("error", (error) => {
    logger.error(error, "Redis connection error");
});

export async function connectRedis(): Promise<void> {
    if (redis.status !== "ready") {
        await redis.connect();
    }
}

export async function disconnectRedis(): Promise<void> {
    if (redis.status === "ready") {
        await redis.quit();
    }
}

export async function updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number
): Promise<void> {
    await redis.geoadd(
        DRIVER_LOCATION_KEY,
        longitude,
        latitude,
        driverId
    );
}

export async function findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusInKm = 5
): Promise<
    Array<{
        driverId: string;
        distance: number;
    }>
> {
    const result = (await redis.georadius(
        DRIVER_LOCATION_KEY,
        longitude,
        latitude,
        radiusInKm,
        "km",
        "WITHDIST",
        "ASC"
    )) as [string, string][];

    console.log("Geo result:", result);

    return result.map((entry) => ({
        driverId: entry[0],
        distance: Number(entry[1]),
    }));
}

export async function removeDriverLocation(
    driverId: string
): Promise<void> {
    await redis.zrem(
        DRIVER_LOCATION_KEY,
        driverId
    );
}

export async function getAvailableDriverCount(): Promise<number> {
    return redis.zcard(DRIVER_LOCATION_KEY);
}

// ── Ride timeout tracking ──

export const RIDE_TIMEOUT_SECONDS = 60;
export const PENDING_RIDES_KEY = "rides:pending";

export async function trackPendingRide(
    rideId: string,
    notifiedDriverIds: string[]
): Promise<void> {
    const pipeline = redis.pipeline();

    // Store notified drivers for decline tracking
    pipeline.set(
        `ride:drivers:${rideId}`,
        JSON.stringify(notifiedDriverIds),
        "EX",
        RIDE_TIMEOUT_SECONDS
    );

    // Sorted set scored by expiry timestamp for efficient polling
    const expiresAt = Date.now() + RIDE_TIMEOUT_SECONDS * 1000;
    pipeline.zadd(PENDING_RIDES_KEY, expiresAt, rideId);

    await pipeline.exec();
}

export async function getNotifiedDrivers(
    rideId: string
): Promise<string[]> {
    const raw = await redis.get(`ride:drivers:${rideId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function updateNotifiedDrivers(
    rideId: string,
    driverIds: string[]
): Promise<void> {
    const ttl = await redis.ttl(`ride:drivers:${rideId}`);

    if (ttl > 0) {
        await redis.set(
            `ride:drivers:${rideId}`,
            JSON.stringify(driverIds),
            "EX",
            ttl
        );
    }
}

export async function removePendingRide(
    rideId: string
): Promise<void> {
    const pipeline = redis.pipeline();
    pipeline.zrem(PENDING_RIDES_KEY, rideId);
    pipeline.del(`ride:drivers:${rideId}`);
    await pipeline.exec();
}

export async function getExpiredPendingRides(): Promise<string[]> {
    const now = Date.now();
    return redis.zrangebyscore(PENDING_RIDES_KEY, "-inf", now);
}