import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const emailToPromote = args[0];

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true
    }
  });

  console.log("\n================ REGISTERED USERS ================");
  if (users.length === 0) {
    console.log("No users found in database.");
  } else {
    users.forEach(u => {
      console.log(`- [${u.isAdmin ? "ADMIN" : "USER"}] ${u.name || "No Name"} (${u.email}) - ID: ${u.id}`);
    });
  }
  console.log("==================================================\n");

  if (emailToPromote) {
    console.log(`Promoting user with email: ${emailToPromote}...`);
    try {
      const updated = await prisma.user.upsert({
        where: { email: emailToPromote.trim().toLowerCase() },
        update: { isAdmin: true },
        create: {
          email: emailToPromote.trim().toLowerCase(),
          isAdmin: true
        }
      });
      console.log(`✅ Success! ${updated.email} is now safelisted as an admin.`);
    } catch (err: any) {
      console.error(`❌ Promotion failed: ${err.message || err}`);
    }
  } else {
    console.log("To promote a user, run:\n  npx ts-node scripts/promote-direct.ts <email>\n");
  }
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
