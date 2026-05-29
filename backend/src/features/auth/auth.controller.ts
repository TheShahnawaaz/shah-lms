import { Request, Response, NextFunction } from "express";
import AuthService from "./auth.service";
import { AuthenticatedRequest } from "../../middlewares/auth";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.register({ email, password, name });
      
      res.status(201).json({
        code: 201,
        details: "User registered successfully.",
        data: result
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        details: err.message || "Registration failed.",
        data: null
      });
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.status(200).json({
        code: 200,
        details: "Login successful.",
        data: result
      });
    } catch (err: any) {
      res.status(401).json({
        code: 401,
        details: err.message || "Invalid credentials.",
        data: null
      });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const profile = await AuthService.getUserProfile(userId);
      res.status(200).json({
        code: 200,
        details: "User profile fetched.",
        data: profile
      });
    } catch (err: any) {
      next(err);
    }
  }
}
export default AuthController;
