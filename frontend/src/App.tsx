import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import RiderPanel from "./components/RiderPanel";
import DriverPanel from "./components/DriverPanel";
import RideStatus from "./components/RideStatus";

import { socket } from "./socket/socket";

import { getDemoUsers } from "./services/demo.service";
import type { DemoUsersResponse } from "./services/demo.service";

import type { Ride } from "./types/ride";
import type { Payment } from "./types/payment";

export default function App() {
    const [users, setUsers] =
        useState<DemoUsersResponse | null>(null);

    const [ride, setRide] =
        useState<Ride | null>(null);

    const [payment, setPayment] =
        useState<Payment | null>(null);

    useEffect(() => {
        async function loadUsers() {
            try {
                const data =
                    await getDemoUsers();

                setUsers(data);
            } catch (err) {
                toast.error(
                    "Unable to load demo users"
                );
            }
        }

        loadUsers();
    }, []);

    useEffect(() => {
        if (ride) {
            setPayment(null);
        }
    }, [ride?.id]);

    useEffect(() => {
        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!users) return;

        socket.emit("rider:join", {
            riderId: users.rider.id,
        });

        socket.emit("driver:join", {
            driverId: users.driver.id,
        });
    }, [users]);

    useEffect(() => {
        socket.on(
            "ride:assigned",
            (updatedRide: Ride) => {
                setRide(updatedRide);

                toast.success(
                    "Driver assigned!"
                );
            }
        );

        socket.on(
            "trip:ended",
            (updatedRide: Ride) => {
                setRide(updatedRide);

                toast.success(
                    "Trip completed!"
                );
            }
        );

        socket.on(
            "payment:completed",
            (payment: Payment) => {
                setPayment(payment);

                toast.success(
                    "Payment successful!"
                );
            }
        );

        socket.on(
            "ride:cancelled",
            (updatedRide: Ride) => {
                setRide(updatedRide);

                toast.error(
                    "Ride cancelled — no driver available"
                );
            }
        );

        return () => {
            socket.off("ride:assigned");
            socket.off("trip:ended");
            socket.off("payment:completed");
            socket.off("ride:cancelled");
        };
    }, []);

    if (!users) {
        return (
            <div className="min-h-screen flex justify-center items-center text-2xl font-bold">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-10">

            <h1 className="text-4xl font-bold text-center mb-10">
                🚕 GoComet Ride Hailing Demo
            </h1>

            <div className="grid grid-cols-2 gap-8">

                <RiderPanel
                    rider={users.rider}
                    ride={ride}
                    setRide={setRide}
                />

                <DriverPanel
                    driver={users.driver}
                    ride={ride}
                    setRide={setRide}
                />

            </div>

            <RideStatus
                ride={ride}
                payment={payment}
                setPayment={setPayment}
            />

        </div>
    );
}