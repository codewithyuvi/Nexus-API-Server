import type { Response } from "express"; 

export class ApiResponseHandler {
    static sendSuccess(
        res: Response,
        data: any | null,
        message: string = 'Operation executed Successfully',
        statusCode: number = 200
    ) : Response {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        })
    }

    static sendError(
        res: Response,
        errorMessage: string = 'an Operation execution failure occured',
        statusCode: number = 400
    ) : Response {
        return res.status(statusCode).json({
            success: false,
            errorMessage
        })
    }
}