import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    logger.error({
        method: req.method,
        url: req.originalUrl,
        error: err,
    });

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: null,
        });
        return;
    }

    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.issues,
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: null,
    });
};