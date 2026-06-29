import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";

import type { DemoUser } from "../services/demo.service";

import {
    updateDriverLocation,
    acceptRide,
    endTrip,
    getDriverEarnings,
} from "../services/driver.service";

import type { DriverEarnings } from "../services/driver.service";
import type { Ride } from "../types/ride";

interface DriverPanelProps {
    driver: DemoUser;
    ride: Ride | null;
    setRide: Dispatch<SetStateAction<Ride | null>>;
}

export default function DriverPanel({
    driver,
    ride,
    setRide,
}: DriverPanelProps) {
    const [loading, setLoading] =
        useState(false);

    const [driverLocation, setDriverLocation] =
        useState({
            lat: 12.9716,
            lng: 77.5946,
        });

    const [earnings, setEarnings] =
        useState<DriverEarnings>({
            completedTrips: 0,
            totalEarnings: 0,
        });

    useEffect(() => {
        async function loadEarnings() {
            try {
                const data =
                    await getDriverEarnings(
                        driver.id
                    );

                setEarnings(data);
            } catch (err) {
                console.error(err);
            }
        }

        loadEarnings();
    }, [driver.id, ride?.status]);

    function moveDriverRandomly() {
        setDriverLocation((prev) => ({
            lat:
                prev.lat +
                (Math.random() - 0.5) * 0.0004,

            lng:
                prev.lng +
                (Math.random() - 0.5) * 0.0004,
        }));
    }

    useEffect(() => {
        const interval = setInterval(() => {
            moveDriverRandomly();
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        updateDriverLocation(
            driver.id,
            driverLocation.lat,
            driverLocation.lng
        ).catch(console.error);

    }, [driver.id, driverLocation]);

    async function handleAcceptRide() {
        if (!ride) {
            toast.error(
                "Create a ride first"
            );
            return;
        }

        try {
            setLoading(true);

            const updatedRide =
                await acceptRide(
                    driver.id,
                    ride.id
                );

            setRide(updatedRide);

            toast.success(
                "Ride accepted!"
            );
        } catch (err) {
            console.error(err);

            toast.error(
                "Unable to accept ride"
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleEndTrip() {
        if (!ride) {
            toast.error(
                "No active trip"
            );
            return;
        }

        try {
            setLoading(true);

            const updatedRide =
                await endTrip(
                    ride.id
                );

            setRide(updatedRide);

            const latest =
                await getDriverEarnings(
                    driver.id
                );

            setEarnings(latest);

            toast.success(
                "Trip completed!"
            );
        } catch (err) {
            console.error(err);

            toast.error(
                "Unable to end trip"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">

            <h2 className="text-2xl font-bold mb-2">
                🚗 Driver
            </h2>

            <p className="text-gray-600 mb-4">
                {driver.fullName}
            </p>

            <div className="mb-6 bg-slate-100 rounded-lg p-4">

                <p>
                    <strong>Completed Trips:</strong>{" "}
                    {earnings.completedTrips}
                </p>

                <p>
                    <strong>Total Earnings:</strong> ₹
                    {earnings.totalEarnings.toFixed(
                        2
                    )}
                </p>

            </div>

            <div className="space-y-4">

                <div className="bg-slate-100 rounded-lg p-4">

                    <h3 className="font-semibold mb-2">
                        Live GPS
                    </h3>

                    <p>
                        <strong>Latitude:</strong>{" "}
                        {driverLocation.lat.toFixed(6)}
                    </p>

                    <p>
                        <strong>Longitude:</strong>{" "}
                        {driverLocation.lng.toFixed(6)}
                    </p>

                </div>

                <button
                    onClick={
                        handleAcceptRide
                    }
                    disabled={
                        loading || !ride
                    }
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 disabled:bg-gray-400"
                >
                    Accept Ride
                </button>

                <button
                    onClick={
                        handleEndTrip
                    }
                    disabled={
                        loading || !ride
                    }
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 disabled:bg-gray-400"
                >
                    End Trip
                </button>

            </div>

            {ride && (
                <div className="mt-6 bg-slate-100 rounded-lg p-4">

                    <h3 className="font-semibold mb-2">
                        Assigned Ride
                    </h3>

                    <p>
                        <strong>Status:</strong>{" "}
                        {ride.status}
                    </p>

                    <p>
                        <strong>Fare:</strong> ₹
                        {ride.fare}
                    </p>

                </div>
            )}

        </div>
    );
}