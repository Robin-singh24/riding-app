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