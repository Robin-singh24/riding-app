import { Router } from "express";
import { z } from "zod";

import { createRide, getRideById } from "./ride.controller";

import { createRideSchema, idempotencyHeaderSchema } from "./ride.validation";

import { validate } from "../../middleware/validate";

const router = Router();

router.post(
    "/",
    validate(createRideSchema),
    (req, res, next) => {
        const result =
            idempotencyHeaderSchema.safeParse(
                req.headers
            );

        if (!result.success) {
            return next(result.error);
        }

        next();
    },
    createRide
);

router.get(
    "/:id",
    validate(
        z.object({
            body: z.object({}),

            params: z.object({
                id: z.uuid(),
            }),

            query: z.object({}),
        })
    ),
    getRideById
);

export default router;