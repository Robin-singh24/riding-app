import { Router } from "express";

import { validate } from "../../middleware/validate";

import { startTrip, endTrip } from "./trip.controller";
import { startTripSchema, endTripSchema } from "./trip.validation";

const router = Router();

router.post(
    "/:id/start",
    validate(startTripSchema),
    startTrip
);

router.post(
    "/:id/end",
    validate(endTripSchema),
    endTrip
);

export default router;