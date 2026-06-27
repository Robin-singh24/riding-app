import { Router } from "express";

import { validate } from "../../middleware/validate";

import { endTrip } from "./trip.controller";
import { endTripSchema } from "./trip.validation";

const router = Router();

router.post(
    "/:id/end",
    validate(endTripSchema),
    endTrip
);

export default router;