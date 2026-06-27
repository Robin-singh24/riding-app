import { Request, Response } from "express";

import { DemoService } from "./demo.service";

export class DemoController {
    constructor(
        private readonly demoService: DemoService
    ) {}

    getDemoUsers = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const users =
            await this.demoService.getDemoUsers();

        res.status(200).json({
            success: true,
            data: users,
        });
    };
}