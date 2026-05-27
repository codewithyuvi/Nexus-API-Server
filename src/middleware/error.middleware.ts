import type { Request, Response, NextFunction } from "express";

export const ErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  console.error("[System Execution Exception Captured]:", err);

  if (err.message === "Unauthenticated" || err.statusCode === 401) {
    return res.status(401).json({
      success: false,
      error:
        "Access Denied. Your session token is missing, expired, or failed verification.",
    });
  }

  if (err.code && typeof err.code === "string" && err.code.startsWith("P")) {
    // P2002 is the explicit Prisma identifier for Unique Field Key violations
    if (err.code === "P2002") {
      const violatedFields = err.meta?.target
        ? ` (${err.meta.target.join(", ")})`
        : "";
      return res.status(409).json({
        success: false,
        error: `Data integrity conflict: An record matching these unique values${violatedFields} already exists.`,
      });
    }

    return res.status(400).json({
      success: false,
      error:
        "A transactional database constraint violation blocked your request.",
    });
  }

  const globalStatus = err.statusCode || 500;
  const globalMessage =
    globalStatus === 500
      ? "An unexpected error occurred within our internal core engine."
      : err.message;

  return res.status(globalStatus).json({
    success: false,
    error: globalMessage,
  });
};