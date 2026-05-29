import { Request, Response, NextFunction } from "express";
import ProblemsService from "./problems.service";

export class ProblemsController {
  static async listProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string | undefined;
      const difficulty = req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined;
      const tag = req.query.tag as string | undefined;

      const result = await ProblemsService.listProblems({
        page,
        limit,
        search,
        difficulty,
        tag
      });

      res.status(200).json({
        code: 200,
        details: "Problems fetched successfully.",
        data: result
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async getProblemDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({
          code: 400,
          details: "Invalid problem ID parameter.",
          data: null
        });
      }

      const problem = await ProblemsService.getProblemDetail(problemId);
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

  static async listTags(req: Request, res: Response, next: NextFunction) {
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
}
export default ProblemsController;
