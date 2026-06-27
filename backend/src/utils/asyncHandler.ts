import {
    NextFunction,
    Request,
    RequestHandler,
    Response,
} from "express";
import { ParsedQs } from "qs";
import { ParamsDictionary } from "express-serve-static-core";

export function asyncHandler<
    P = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs
>(
    fn: (
        req: Request<P, ResBody, ReqBody, ReqQuery>,
        res: Response<ResBody>,
        next: NextFunction
    ) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}