import { useEffect, useState } from "react";

import type { Coordinate } from "../utils/geo";

import {
    hasReachedTarget,
    moveTowardsTarget,
} from "../utils/geo";

interface DriverSimulationParams {
    initialLocation: Coordinate;
    onArrival?: () => void;
}

export function useDriverSimulation({
    initialLocation,
    onArrival,
}: DriverSimulationParams) {
    const [driverLocation, setDriverLocation] =
        useState(initialLocation);

    const [targetLocation, setTargetLocation] =
        useState<Coordinate | null>(null);

    const [isNavigating, setIsNavigating] =
        useState(false);

    useEffect(() => {
        if (!targetLocation) return;

        const interval = setInterval(() => {
            setDriverLocation((current) => {
                if (
                    hasReachedTarget(
                        current,
                        targetLocation
                    )
                ) {
                    setIsNavigating(false);
                    setTargetLocation(null);
                    onArrival?.();
                    return targetLocation;
                }

                return moveTowardsTarget(
                    current,
                    targetLocation
                );
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [targetLocation]);

    function navigateTo(
        target: Coordinate
    ) {
        setTargetLocation(target);
        setIsNavigating(true);
    }

    function stopNavigation() {
        setTargetLocation(null);
        setIsNavigating(false);
    }

    return {
        driverLocation,

        targetLocation,

        isNavigating,

        navigateTo,

        stopNavigation,
    };
}