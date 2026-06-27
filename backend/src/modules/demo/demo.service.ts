import { Role } from "@prisma/client";

import { ApiError } from "../../utils/ApiError";

import { DemoRepository } from "./demo.repository";

export class DemoService {
    constructor(
        private readonly demoRepository: DemoRepository
    ) {}

    async getDemoUsers() {
        const rider =
            await this.demoRepository.findUserByRole(
                Role.RIDER
            );

        const driver =
            await this.demoRepository.findUserByRole(
                Role.DRIVER
            );

        if (!rider || !driver) {
            throw new ApiError(
                404,
                "Demo users not found. Please run the seed."
            );
        }

        return {
            rider: {
                id: rider.id,
                fullName: rider.fullName,
            },

            driver: {
                id: driver.id,
                fullName: driver.fullName,
            },
        };
    }
}