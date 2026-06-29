import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";

import type { DemoUser } from "../services/demo.service";
import { useDriverSimulation } from "../hooks/useDriverSimulation";

import {
    updateDriverLocation,
    acceptRide,
    declineRide,
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

    const {
        driverLocation,
        navigateTo,
        stopNavigation,
        isNavigating,
    } = useDriverSimulation({
        initialLocation: {
            lat: 12.9716,
            lng: 77.5946,
        },
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

    useEffect(() => {
        async function syncDriverLocation() {
            try {
                await updateDriverLocation(
                    driver.id,
                    driverLocation.lat,
                    driverLocation.lng
                );
            } catch (err) {
                console.error(err);
            }
        }

        syncDriverLocation();
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

            navigateTo({
                lat: updatedRide.destinationLat,
                lng: updatedRide.destinationLng,
            });

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

    async function handleDeclineRide() {
        if (!ride) return;

        try {
            setLoading(true);

            await declineRide(
                driver.id,
                ride.id
            );

            setRide(null);

            toast.success("Ride declined");
        } catch (err) {
            console.error(err);

            toast.error(
                "Unable to decline ride"
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

            stopNavigation();

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

                    <p className="text-sm mt-2">
                        <strong>Status:</strong>{" "}
                        {isNavigating
                            ? "🚗 Driving"
                            : "🟢 Idle"}
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
                        handleDeclineRide
                    }
                    disabled={
                        loading || !ride
                    }
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg py-3 disabled:bg-gray-400"
                >
                    Decline Ride
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