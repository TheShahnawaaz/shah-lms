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

// GET allowed users list
router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await AdminService.listUsers();
      return res.status(200).json({
        code: 200,
        details: "Allowed users list fetched.",
        data: users
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to fetch users list.",
        data: null
      });
    }
  }
);

// POST add email to allowed users list
router.post(
  "/users",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, isAdmin } = req.body;
    try {
      const newUser = await AdminService.addAllowedUser(email, isAdmin);
      return res.status(201).json({
        code: 201,
        details: "User safelisted successfully.",
        data: newUser
      });
    } catch (err: any) {
      return res.status(400).json({
        code: 400,
        details: err.message || "Failed to safelist user.",
        data: null
      });
    }
  }
);

// DELETE allowed user
router.delete(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const currentAdminId = req.user?.id;

    if (!currentAdminId) {
      return res.status(401).json({
        code: 401,
        details: "Unauthorized.",
        data: null
      });
    }

    try {
      const result = await AdminService.deleteUser(id, currentAdminId);
      return res.status(200).json({
        code: 200,
        details: "User access revoked successfully.",
        data: result
      });
    } catch (err: any) {
      return res.status(400).json({
        code: 400,
        details: err.message || "Failed to revoke user access.",
        data: null
      });
    }
  }
);

// POST import course from JSON payload
router.post(
  "/courses/import",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const coursePayload = req.body;

    if (!coursePayload || !coursePayload.course_id || !coursePayload.course_name) {
      return res.status(400).json({
        code: 400,
        details: "Bad Request: Invalid course JSON structure.",
        data: null
      });
    }

    try {
      const result = await AdminService.importCourse(coursePayload);
      return res.status(200).json({
        code: 200,
        details: "Course import processed.",
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to import course.",
        data: null
      });
    }
  }
);

// GET admin system statistics
router.get(
  "/stats",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await AdminService.getSystemStats();
      return res.status(200).json({
        code: 200,
        details: "System statistics retrieved.",
        data: stats
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to retrieve statistics.",
        data: null
      });
    }
  }
);

// GET list all courses for admin
router.get(
  "/courses",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courses = await AdminService.listCoursesForAdmin();
      return res.status(200).json({
        code: 200,
        details: "Courses list fetched for admin.",
        data: courses
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to retrieve courses list.",
        data: null
      });
    }
  }
);

// PATCH toggle course visibility
router.patch(
  "/courses/:id/visibility",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const courseId = parseInt(req.params.id);
    const { isVisible } = req.body;

    if (isNaN(courseId)) {
      return res.status(400).json({
        code: 400,
        details: "Invalid course ID parameter.",
        data: null
      });
    }

    if (typeof isVisible !== "boolean") {
      return res.status(400).json({
        code: 400,
        details: "Bad Request: 'isVisible' must be a boolean in the request body.",
        data: null
      });
    }

    try {
      const updatedCourse = await AdminService.toggleCourseVisibility(courseId, isVisible);
      return res.status(200).json({
        code: 200,
        details: "Course visibility updated successfully.",
        data: updatedCourse
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to toggle course visibility.",
        data: null
      });
    }
  }
);

// DELETE course
router.delete(
  "/courses/:id",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const courseId = parseInt(req.params.id);

    if (isNaN(courseId)) {
      return res.status(400).json({
        code: 400,
        details: "Invalid course ID parameter.",
        data: null
      });
    }

    try {
      const result = await AdminService.deleteCourse(courseId);
      return res.status(200).json({
        code: 200,
        details: "Course deleted successfully.",
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({
        code: 500,
        details: err.message || "Failed to delete course.",
        data: null
      });
    }
  }
);

// POST impersonate a user
router.post(
  "/impersonate/:id",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const result = await AdminService.impersonateUser(id);
      return res.status(200).json({
        code: 200,
        details: "Impersonation token generated.",
        data: result
      });
    } catch (err: any) {
      return res.status(400).json({
        code: 400,
        details: err.message || "Failed to impersonate user.",
        data: null
      });
    }
  }
);

export default router;
