import type { Response, Request } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { ApiResponseHandler } from "../utils/apiResponse";

export const getUser = (req: Request, res: Response) => {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.auth.userId;

    if(!userId){
        ApiResponseHandler.sendError(
            res,
            'Error getting the user',
            400
        )
    }

    ApiResponseHandler.sendSuccess(
        res,
        userId,
        'You have securely accessed a protected route.',
        200
    )
}