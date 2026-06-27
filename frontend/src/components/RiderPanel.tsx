import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";

import type { DemoUser } from "../services/demo.service";
import { createRide } from "../services/ride.service";
import type { Ride } from "../types/ride";

interface RiderPanelProps {
    rider: DemoUser;
    ride: Ride | null;
    setRide: Dispatch<SetStateAction<Ride | null>>;
}

export default function RiderPanel({
    rider,
    ride,
    setRide,
}: RiderPanelProps) {
    const [pickupLat, setPickupLat] =
        useState("12.9716");

    const [pickupLng, setPickupLng] =
        useState("77.5946");

    const [destinationLat, setDestinationLat] =
        useState("12.9352");

    const [destinationLng, setDestinationLng] =
        useState("77.6245");

    const [loading, setLoading] =
        useState(false);

    async function handleCreateRide() {
        try {
            setLoading(true);

            const newRide =
                await createRide({
                    riderId: rider.id,

                    pickup: {
                        lat: Number(pickupLat),
                        lng: Number(pickupLng),
                    },

                    destination: {
                        lat: Number(destinationLat),
                        lng: Number(destinationLng),
                    },

                    paymentMethod: "UPI",

                    idempotencyKey:
                        crypto.randomUUID(),
                });

            setRide(newRide);

            toast.success(
                "Ride requested successfully!"
            );
        } catch (err) {
            console.error(err);

            toast.error(
                "Unable to create ride"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">

            <h2 className="text-2xl font-bold mb-2">
                👤 Rider
            </h2>

            <p className="text-gray-600 mb-6">
                {rider.fullName}
            </p>

            <div className="grid grid-cols-2 gap-3">

                <input
                    type="number"
                    value={pickupLat}
                    onChange={(e) =>
                        setPickupLat(
                            e.target.value
                        )
                    }
                    placeholder="Pickup Lat"
                    className="border rounded-lg p-2"
                />

                <input
                    type="number"
                    value={pickupLng}
                    onChange={(e) =>
                        setPickupLng(
                            e.target.value
                        )
                    }
                    placeholder="Pickup Lng"
                    className="border rounded-lg p-2"
                />

                <input
                    type="number"
                    value={destinationLat}
                    onChange={(e) =>
                        setDestinationLat(
                            e.target.value
                        )
                    }
                    placeholder="Destination Lat"
                    className="border rounded-lg p-2"
                />

                <input
                    type="number"
                    value={destinationLng}
                    onChange={(e) =>
                        setDestinationLng(
                            e.target.value
                        )
                    }
                    placeholder="Destination Lng"
                    className="border rounded-lg p-2"
                />

            </div>

            <button
                onClick={handleCreateRide}
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 disabled:bg-gray-400"
            >
                {loading
                    ? "Creating..."
                    : "Request Ride"}
            </button>

            {ride && (
                <div className="mt-6 bg-slate-100 rounded-lg p-4">

                    <h3 className="font-semibold mb-2">
                        Current Ride
                    </h3>

                    <p>
                        <strong>Status:</strong>{" "}
                        {ride.status}
                    </p>

                    <p>
                        <strong>Fare:</strong> ₹
                        {ride.fare}
                    </p>

                    <p className="break-all text-sm mt-2">
                        {ride.id}
                    </p>

                </div>
            )}

        </div>
    );
}