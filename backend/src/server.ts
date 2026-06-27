import "newrelic";
// console.log(process.env.NEW_RELIC_LICENSE_KEY);
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

const server = http.createServer(app);

async function startServer(): Promise<void> {
    try {
        await prisma.$connect();

        await connectRedis();

        server.listen(env.PORT, () => {
            logger.info(`Server running on port ${env.PORT}`);
            initializeSocket(server);
        });
    } catch (error) {
        logger.error(error);

        process.exit(1);
    }
}

startServer();

async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Shutting down gracefully...`);

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