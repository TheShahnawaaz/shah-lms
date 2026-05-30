import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping all editorials, templates, problems, and tags from database...");
  
  // Clean relations first (onDelete Cascade is set, but this guarantees absolute cleanup)
  const deletedEditorials = await prisma.editorial.deleteMany({});
  const deletedTemplates = await prisma.templateCode.deleteMany({});
  const deletedProblems = await prisma.problem.deleteMany({});
  const deletedTags = await prisma.tag.deleteMany({});

  console.log(`✅ Success! Cleared:`);
  console.log(`   - Editorials: ${deletedEditorials.count}`);
  console.log(`   - Templates:  ${deletedTemplates.count}`);
  console.log(`   - Problems:   ${deletedProblems.count}`);
  console.log(`   - Tags:       ${deletedTags.count}`);
}

main()
  .catch(err => {
    console.error("❌ Failed to clear database:", err.message || err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
