import type { Request, Response } from 'express';

export const checkHealth = (req: Request, res: Response) => {
    res.status(200).json({status: true, message: 'API is fully operational.'}) 
}