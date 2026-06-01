import prisma from "../../config/db";

export class SubmissionsService {
  static async createSubmission(
    userId: string,
    problemId: number,
    code: string,
    language: string,
    status: string,
    executionTimeMs: number,
    sampleResults: any
  ) {
    // Verify problem exists first
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      throw new Error(`Problem with ID ${problemId} not found.`);
    }

    return prisma.submission.create({
      data: {
        userId,
        problemId,
        code,
        language,
        status,
        executionTimeMs,
        sampleResults,
      },
    });
  }

  static async getSubmissionHistory(userId: string, problemId: number) {
    return prisma.submission.findMany({
      where: {
        userId,
        problemId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async getUserSolvedProblems(userId: string) {
    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        status: "Accepted",
      },
      select: {
        problemId: true,
      },
    });

    // Return set/array of unique solved problem IDs
    return Array.from(new Set(submissions.map((s) => s.problemId)));
  }
}
export default SubmissionsService;
