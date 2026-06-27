import { api } from "../api/api";

import type { Payment } from "../types/payment";

export async function makePayment(
    rideId: string
): Promise<Payment> {
    const response = await api.post(
        "/payments",
        {
            rideId,
        }
    );

    return response.data.data;
}