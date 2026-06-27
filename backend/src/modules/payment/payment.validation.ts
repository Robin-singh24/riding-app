import { z } from "zod";

export const createPaymentSchema = z.object({
    body: z.object({
        rideId: z.uuid(),
    }),

    params: z.object({}),

    query: z.object({}),
});