import { Router } from "express";

import { validate } from "../../middleware/validate";

import { createPayment } from "./payment.controller";
import { createPaymentSchema } from "./payment.validation";

const router = Router();

router.post(
    "/",
    validate(createPaymentSchema),
    createPayment
);

export default router;