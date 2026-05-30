import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middlewares/auth";
import { adminMiddleware } from "../../middlewares/admin";
import AdminService from "./admin.service";

const router = Router();

// Endpoint to promote a user to admin using a secret key
router.post("/promote", async (req, res) => {
  const { email } = req.body;
  const adminSecretHeader = req.headers["x-admin-secret"];
  const configuredSecret = process.env.ADMIN_SECRET || "super_secret_admin_promotion_key";

  if (!adminSecretHeader || adminSecretHeader !== configuredSecret) {
    return res.status(401).json({
      code: 401,
      details: "Unauthorized: Invalid or missing X-Admin-Secret header.",
      data: null
    });
  }

  if (!email) {
    return res.status(400).json({
      code: 400,
      details: "Bad Request: Email is required.",
      data: null
    });
  }

  try {
    const updatedUser = await AdminService.promoteUser(email);
    return res.status(200).json({
      code: 200,
      details: "User promoted to admin successfully.",
      data: updatedUser
    });
  } catch (err: any) {
    return res.status(404).json({
      code: 404,
      details: err.message || "User promotion failed.",
      data: null
    });
  }
});

// Endpoint to seed problems directly from request body
router.post(
  "/seed",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { problems } = req.body;

    if (!problems || !Array.isArray(problems)) {
      return res.status(400).json({
        code: 400,
        details: "Bad Request: 'problems' must be an array in the request body.",
        data: null
      });
    }

    try {
      const result = await AdminService.seedProblems(problems);
      return res.status(200).json({
        code: 200,
        details: "Seeding batch processed.",
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Seeding failed.",
        data: null
      });
    }
  }
);

// Endpoint to retrieve status of the seeding process
router.get(
  "/seed/status",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = AdminService.getSeedStatus();
      return res.status(200).json({
        code: 200,
        details: "Seeding status retrieved.",
        data: status
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Retrieving status failed.",
        data: null
      });
    }
  }
);

export default router;
