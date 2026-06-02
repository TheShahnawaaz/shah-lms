import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth";
import CoursesService from "./courses.service";

export class CoursesController {
  static async listCourses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const courses = await CoursesService.listCourses(userId, false);
      res.status(200).json({
        code: 200,
        details: "Courses list fetched successfully.",
        data: courses
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getCourseDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid course ID parameter.",
          data: null
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const course = await CoursesService.getCourseDetail(courseId, userId, req.user?.isAdmin || false);
      res.status(200).json({
        code: 200,
        details: "Course syllabus structure fetched.",
        data: course
      });
    } catch (err: any) {
      res.status(404).json({
        code: 404,
        details: err.message || "Course not found.",
        data: null
      });
    }
  }

  static async completeResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resourceId = parseInt(req.params.resourceId);
      if (isNaN(resourceId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid resource ID parameter.",
          data: null
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const result = await CoursesService.completeResource(resourceId, userId);
      res.status(201).json({
        code: 201,
        details: "Resource completion status updated successfully.",
        data: result
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async uncompleteResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resourceId = parseInt(req.params.resourceId);
      if (isNaN(resourceId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid resource ID parameter.",
          data: null
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      await CoursesService.uncompleteResource(resourceId, userId);
      res.status(200).json({
        code: 200,
        details: "Resource completion status cleared successfully.",
        data: null
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getResourceDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resourceId = parseInt(req.params.resourceId);
      if (isNaN(resourceId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid resource ID parameter.",
          data: null
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const resource = await CoursesService.getResourceDetail(resourceId, userId, req.user?.isAdmin || false);
      res.status(200).json({
        code: 200,
        details: "Resource details fetched successfully.",
        data: resource
      });
    } catch (err: any) {
      res.status(404).json({
        code: 404,
        details: err.message || "Resource not found.",
        data: null
      });
    }
  }
}
export default CoursesController;
