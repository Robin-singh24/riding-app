import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";

import { makePayment } from "../services/payment.service";

import type { Ride } from "../types/ride";
import type { Payment } from "../types/payment";

interface RideStatusProps {
    ride: Ride | null;

    payment: Payment | null;

    setPayment: Dispatch<
        SetStateAction<Payment | null>
    >;
}

export default function RideStatus({
    ride,
    payment,
    setPayment,
}: RideStatusProps) {

    async function handlePayment() {
        if (!ride) return;

        try {
            const response =
                await makePayment(
                    ride.id
                );

            setPayment(response);

            toast.success(
                "Payment Successful!"
            );
        } catch (err) {
            console.error(err);

            toast.error(
                "Payment Failed"
            );
        }
    }

    return (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">

            <h2 className="text-2xl font-bold mb-6">
                Ride Status
            </h2>

            {!ride && (
                <p className="text-gray-500">
                    No active ride.
                </p>
            )}

            {ride && (
                <>

                    <div className="grid grid-cols-2 gap-4">

                        <div>
                            <p className="text-gray-500">
                                Ride ID
                            </p>

                            <p className="text-sm break-all">
                                {ride.id}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-500">
                                Status
                            </p>

                            <p className="font-semibold">
                                {ride.status}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-500">
                                Driver
                            </p>

                            <p>
                                {ride.driverId ??
                                    "Not Assigned"}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-500">
                                Fare
                            </p>

                            <p>
                                ₹{ride.fare}
                            </p>
                        </div>

                    </div>

                    {ride.status ===
                        "COMPLETED" &&
                        !payment && (
                            <button
                                onClick={
                                    handlePayment
                                }
                                className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3"
                            >
                                Pay Now
                            </button>
                        )}

                    {payment && (
                        <div className="mt-8 border-t pt-6">

                            <h3 className="text-xl font-semibold mb-4">
                                Payment
                            </h3>

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <p className="text-gray-500">
                                        Status
                                    </p>

                                    <p className="font-semibold">
                                        {payment.status}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500">
                                        Method
                                    </p>

                                    <p>
                                        {payment.paymentMethod}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500">
                                        Amount
                                    </p>

                                    <p>
                                        ₹{payment.amount}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-500">
                                        Transaction
                                    </p>

                                    <p className="text-sm break-all">
                                        {payment.transactionId ??
                                            "-"}
                                    </p>
                                </div>

                            </div>

                        </div>
                    )}

                </>
            )}

        </div>
    );
}