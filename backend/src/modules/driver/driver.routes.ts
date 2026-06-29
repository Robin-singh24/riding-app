import { Router } from "express";

import { validate } from "../../middleware/validate";

import {
    acceptRide,
    declineRide,
    updateDriverLocation,
    getDriverEarnings
} from "./driver.controller";

import {
    acceptRideSchema,
    declineRideSchema,
    updateDriverLocationSchema,
} from "./driver.validation";

const router = Router();

router.post(
    "/:id/location",
    validate(updateDriverLocationSchema),
    updateDriverLocation
);

router.post(
    "/:id/accept",
    validate(acceptRideSchema),
    acceptRide
);

router.post(
    "/:id/decline",
    validate(declineRideSchema),
    declineRide
);

router.get(
    "/:id/earnings",
    getDriverEarnings
);

export default router;