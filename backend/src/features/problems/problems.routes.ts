import { Router } from "express";
import ProblemsController from "./problems.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

// Require authentication for all problem routes
router.use(authMiddleware);

router.get("/", ProblemsController.listProblems);
router.get("/tags", ProblemsController.listTags);
router.get("/:id", ProblemsController.getProblemDetail);

export default router;
