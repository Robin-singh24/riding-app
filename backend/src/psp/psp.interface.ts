export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    message: string;
}

export interface PspProvider {
    processPayment(
        paymentId: string,
        amount: number
    ): Promise<PaymentResult>;
}