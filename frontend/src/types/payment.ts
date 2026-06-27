export interface Payment {
    id: string;

    rideId: string;

    amount: string;

    paymentMethod: string;

    status: string;

    transactionId: string | null;

    createdAt: string;
    updatedAt: string;
}