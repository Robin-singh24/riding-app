import crypto from "crypto";

import { PspProvider, PaymentResult } from "./psp.interface";

export class MockPspProvider implements PspProvider {
    async processPayment(
        paymentId: string,
        amount: number
    ): Promise<PaymentResult> {

        await new Promise((resolve) =>
            setTimeout(resolve, 500)
        );

        const success = Math.random() < 0.95;

        if (!success) {
            return {
                success: false,
                message: "Payment declined by Mock PSP",
            };
        }

        return {
            success: true,
            message: "Payment processed successfully",
            transactionId: `MOCK_TXN_${crypto.randomUUID()}`,
        };
    }
}