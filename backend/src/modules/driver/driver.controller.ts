import { Response } from "express";

import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import {
    AcceptRideDto,
    AcceptRideRequest,
    DeclineRideDto,
    DeclineRideRequest,
    DriverLocationDto,
    UpdateDriverLocationRequest,
} from "./driver.dto";
import { DriverRepository } from "./driver.repository";
import { DriverService } from "./driver.service";

const driverRepository = new DriverRepository();
const driverService = new DriverService(driverRepository);

export const updateDriverLocation = asyncHandler<
    { id: string },
    any,
    UpdateDriverLocationRequest
>(async (req, res: Response) => {
    const dto: DriverLocationDto = {
        driverId: req.params.id,

        lat: req.body.lat,
        lng: req.body.lng,
    };

    await driverService.updateLocation(dto);

    return res.status(200).json(
        new ApiResponse(
            "Driver location updated successfully",
            null
        )
    );
});

export const acceptRide = asyncHandler<
    { id: string },
    any,
    AcceptRideRequest
>(async (req, res: Response) => {
    const dto: AcceptRideDto = {
        driverId: req.params.id,

        rideId: req.body.rideId,
    };

    const ride = await driverService.acceptRide(dto);

    return res.status(200).json(
        new ApiResponse(
            "Ride accepted successfully",
            ride
        )
    );
});

export const declineRide = asyncHandler<
    { id: string },
    any,
    DeclineRideRequest
>(async (req, res: Response) => {
    const dto: DeclineRideDto = {
        driverId: req.params.id,
        rideId: req.body.rideId,
    };

    await driverService.declineRide(dto);

    return res.status(200).json(
        new ApiResponse(
            "Ride declined",
            null
        )
    );
});

export const getDriverEarnings = asyncHandler<
    { id: string }
>(async (req, res: Response) => {
    const earnings =
        await driverService.getDriverEarnings(
            req.params.id
        );

    return res.status(200).json(
        new ApiResponse(
            "Driver earnings fetched successfully",
            earnings
        )
    );
});