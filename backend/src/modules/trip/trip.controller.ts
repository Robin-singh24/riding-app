import { Response } from "express";

import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import { EndTripDto } from "./trip.dto";
import { TripRepository } from "./trip.repository";
import { TripService } from "./trip.service";

const tripRepository = new TripRepository();
const tripService = new TripService(tripRepository);

export const endTrip = asyncHandler<
    { id: string }
>(async (req, res: Response) => {
    const dto: EndTripDto = {
        tripId: req.params.id,
    };

    const ride = await tripService.endTrip(dto);

    return res.status(200).json(
        new ApiResponse(
            "Trip ended successfully",
            ride
        )
    );
});