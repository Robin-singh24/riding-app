import { z } from "zod";

export const startTripSchema = z.object({
    body: z.object({}),

    params: z.object({
        id: z.uuid(),
    }),

    query: z.object({}),
});

export const endTripSchema = z.object({
    body: z.object({}),

    params: z.object({
        id: z.uuid(),
    }),

    query: z.object({}),
});