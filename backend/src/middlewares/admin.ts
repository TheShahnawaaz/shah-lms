import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      code: 403,
      details: "Forbidden: Admin access required.",
      data: null
    });
  }
  next();
}
