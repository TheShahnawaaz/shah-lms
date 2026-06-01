import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth";
import ProblemsService from "./problems.service";
import SubmissionsService from "./submissions.service";

export class ProblemsController {
  static async listProblems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string | undefined;
      const difficulty = req.query.difficulty
        ? parseInt(req.query.difficulty as string)
        : undefined;
      const tag = req.query.tag as string | undefined;
      const bookmarked = req.query.bookmarked === "true";

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const result = await ProblemsService.listProblems(
        {
          page,
          limit,
          search,
          difficulty,
          tag,
          bookmarked
        },
        userId
      );

      res.status(200).json({
        code: 200,
        details: "Problems fetched successfully.",
        data: result
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getProblemDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
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

      const problem = await ProblemsService.getProblemDetail(problemId, userId);
      res.status(200).json({
        code: 200,
        details: "Problem details fetched.",
        data: problem
      });
    } catch (err: any) {
      res.status(404).json({
        code: 404,
        details: err.message || "Problem not found.",
        data: null
      });
    }
  }

  static async bookmarkProblem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
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

      const bookmark = await ProblemsService.bookmarkProblem(problemId, userId);
      res.status(201).json({
        code: 201,
        details: "Problem bookmarked successfully.",
        data: bookmark
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async unbookmarkProblem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
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

      await ProblemsService.unbookmarkProblem(problemId, userId);
      res.status(200).json({
        code: 200,
        details: "Problem unbookmarked successfully.",
        data: null
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async listTags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tags = await ProblemsService.listAllTags();
      res.status(200).json({
        code: 200,
        details: "Tags list fetched.",
        data: tags
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getProblemsStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          code: 401,
          details: "Unauthorized.",
          data: null
        });
      }

      const stats = await ProblemsService.getProblemsStats(userId);
      res.status(200).json({
        code: 200,
        details: "Statistics fetched successfully.",
        data: stats
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async submitCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
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

      const { code, language, status, executionTimeMs, sampleResults } = req.body;
      if (!code || !language || !status) {
        return res.status(400).json({
          code: 400,
          details: "Missing required fields (code, language, status).",
          data: null
        });
      }

      const submission = await SubmissionsService.createSubmission(
        userId,
        problemId,
        code,
        language,
        status,
        executionTimeMs || 0,
        sampleResults || []
      );

      res.status(201).json({
        code: 201,
        details: "Code submitted and saved successfully.",
        data: submission
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getSubmissionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
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

      const history = await SubmissionsService.getSubmissionHistory(userId, problemId);
      res.status(200).json({
        code: 200,
        details: "Submission history fetched.",
        data: history
      });
    } catch (err: any) {
      next(err);
    }
  }
}
export default ProblemsController;
