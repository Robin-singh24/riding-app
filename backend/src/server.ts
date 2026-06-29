import "newrelic";

import http from "http";

import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import {
    connectRedis,
    disconnectRedis,
} from "./config/redis";
import { initializeSocket } from "./socket/socket";
import {
    startRideTimeoutWorker,
    stopRideTimeoutWorker,
} from "./workers/rideTimeout.worker";

const server = http.createServer(app);

async function startServer(): Promise<void> {
    try {
        await prisma.$connect();

        await connectRedis();

        server.listen(env.PORT, () => {
            logger.info(`Server running on port ${env.PORT}`);
            initializeSocket(server);
            startRideTimeoutWorker();
        });
    } catch (error) {
        logger.error(error);

        process.exit(1);
    }
}

startServer();

async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Shutting down gracefully...`);

    stopRideTimeoutWorker();

    await prisma.$disconnect();

    await disconnectRedis();

    server.close(() => {
        logger.info("Server stopped.");

        process.exit(0);
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});