import { Payment } from "@prisma/client";

export interface CreatePaymentDto {
    rideId: string;
}

export interface CreatePaymentRequest {
    rideId: string;
}

export interface PaymentResponseDto {
    payment: Payment;
}