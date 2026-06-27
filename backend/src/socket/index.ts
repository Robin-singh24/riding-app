import { Payment, Ride } from "@prisma/client";


import { getIo } from "./socket";

export function notifyRideRequested(
    driverId: string,
    ride: Ride
): void {
    getIo()
        .to(`driver:${driverId}`)
        .emit("ride:requested", ride);
}

export function notifyRideAssigned(
    riderId: string,
    ride: Ride
): void {
    getIo()
        .to(`rider:${riderId}`)
        .emit("ride:assigned", ride);
}

export function notifyTripEnded(
    riderId: string,
    ride: Ride
): void {
    getIo()
        .to(`rider:${riderId}`)
        .emit("trip:ended", ride);
}

export function notifyPaymentCompleted(
    riderId: string,
    payment: Payment
): void {
    getIo()
        .to(`rider:${riderId}`)
        .emit("payment:completed", payment);
}