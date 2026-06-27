import { Server as HttpServer } from "http";

import { Server, Socket } from "socket.io";
import { logger } from "../config/logger";

let io: Server;

export function initializeSocket(server: HttpServer): Server {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket: Socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        socket.on(
            "rider:join",
            ({ riderId }: { riderId: string }) => {
                socket.join(`rider:${riderId}`);

                logger.info(`Rider ${riderId} joined`);
            }
        );


        // socket.on("rider:join", (payload: string) => {
        //     try {
        //         const { riderId } = JSON.parse(payload);
        //         socket.join(`rider:${riderId}`);
        //         logger.info(`Rider ${riderId} joined`);
        //     } catch (err) {
        //         logger.error(`Error parsing payload: ${err}`);
        //     }
        // });

        socket.on(
            "driver:join",
            ({ driverId }: { driverId: string }) => {
                socket.join(`driver:${driverId}`);

                logger.info(`Driver ${driverId} joined`);
            }
        );

        socket.on("disconnect", () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}

export function getIo(): Server {
    if (!io) {
        throw new Error("Socket.IO has not been initialized.");
    }

    return io;
}