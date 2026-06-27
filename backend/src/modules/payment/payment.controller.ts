import { Response } from "express";

import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import {
    CreatePaymentDto,
    CreatePaymentRequest,
} from "./payment.dto";

import { PaymentRepository } from "./payment.repository";
import { PaymentService } from "./payment.service";

const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository);

export const createPayment = asyncHandler<
    {},
    any,
    CreatePaymentRequest
>(async (req, res: Response) => {
    const dto: CreatePaymentDto = {
        rideId: req.body.rideId,
    };

    const payment = await paymentService.createPayment(dto);

    return res.status(201).json(
        new ApiResponse(
            "Payment processed successfully",
            payment
        )
    );
});