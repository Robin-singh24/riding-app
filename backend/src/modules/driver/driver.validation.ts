import { z } from "zod";

export const updateDriverLocationSchema = z.object({
    body: z.object({
        lat: z.number().min(-90).max(90),

        lng: z.number().min(-180).max(180),
    }),

    params: z.object({
        id: z.uuid(),
    }),

    query: z.object({}),
});

export const acceptRideSchema = z.object({
    body: z.object({
        rideId: z.uuid(),
    }),

    params: z.object({
        id: z.uuid(),
    }),

    query: z.object({}),
});

export const declineRideSchema = z.object({
    body: z.object({
        rideId: z.uuid(),
    }),

    params: z.object({
        id: z.uuid(),
    }),

    query: z.object({}),
});