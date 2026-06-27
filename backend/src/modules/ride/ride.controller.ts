import { Request, Response } from "express";

import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import { CreateRideDto } from "./ride.dto";
import { RideRepository } from "./ride.repository";
import { RideService } from "./ride.service";

const rideRepository = new RideRepository();
const rideService = new RideService(rideRepository);

export const createRide = asyncHandler<{}, any, CreateRideDto>(
    async (req: Request<{}, {}, CreateRideDto>, res: Response) => {
        const dto: CreateRideDto = {
            riderId: req.body.riderId,
            pickup: req.body.pickup,
            destination: req.body.destination,
            paymentMethod: req.body.paymentMethod,
            idempotencyKey: req.header("Idempotency-Key")!,
        };

        const ride = await rideService.createRide(dto);

        return res.status(201).json(
            new ApiResponse(
                "Ride created successfully",
                ride
            )
        );
    }
);

export const getRideById = asyncHandler<{ id: string }>(
    async (req: Request<{ id: string }>, res: Response) => {
        const ride = await rideService.getRideById(req.params.id);

        return res.status(200).json(
            new ApiResponse(
                "Ride fetched successfully",
                ride
            )
        );
    }
);