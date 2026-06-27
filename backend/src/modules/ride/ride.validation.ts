import { z } from "zod";

export const createRideSchema = z.object({
    body: z.object({
        riderId: z.uuid(),

        pickup: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
        }),

        destination: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
        }),

        paymentMethod: z.enum([
            "CASH",
            "CARD",
            "UPI",
        ]),
    }),

    params: z.object({}),

    query: z.object({}),
});

export const idempotencyHeaderSchema = z.object({
    "idempotency-key": z.uuid(),
});