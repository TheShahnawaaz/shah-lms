import { Router } from "express";
import CoursesController from "./courses.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// Authenticate all course routes
router.use(authMiddleware);

router.get("/", CoursesController.listCourses);
router.get("/:id", CoursesController.getCourseDetail);
router.get("/resources/:resourceId", CoursesController.getResourceDetail);
router.post("/resources/:resourceId/complete", CoursesController.completeResource);
router.delete("/resources/:resourceId/complete", CoursesController.uncompleteResource);

export default router;
