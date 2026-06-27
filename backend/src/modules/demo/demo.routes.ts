import { Router } from "express";

import { asyncHandler } from "../../utils/asyncHandler";

import { DemoController } from "./demo.controller";
import { DemoRepository } from "./demo.repository";
import { DemoService } from "./demo.service";

const router = Router();

const repository = new DemoRepository();

const service = new DemoService(repository);

const controller = new DemoController(service);

router.get(
    "/users",
    asyncHandler(controller.getDemoUsers)
);

export default router;