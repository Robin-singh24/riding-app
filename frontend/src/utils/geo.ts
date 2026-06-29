export interface Coordinate {
    lat: number;
    lng: number;
}

export function calculateDistance(
    from: Coordinate,
    to: Coordinate
): number {
    const latDiff = to.lat - from.lat;
    const lngDiff = to.lng - from.lng;

    return Math.sqrt(
        latDiff * latDiff +
        lngDiff * lngDiff
    );
}

export function hasReachedTarget(
    current: Coordinate,
    target: Coordinate,
    threshold = 0.0001
): boolean {
    return (
        calculateDistance(current, target) <=
        threshold
    );
}

export function moveTowardsTarget(
    current: Coordinate,
    target: Coordinate,
    step = 0.0008
): Coordinate {
    const distance = calculateDistance(
        current,
        target
    );

    if (distance <= step) {
        return target;
    }

    const latDiff = target.lat - current.lat;
    const lngDiff = target.lng - current.lng;

    return {
        lat:
            current.lat +
            (latDiff / distance) * step,

        lng:
            current.lng +
            (lngDiff / distance) * step,
    };
}