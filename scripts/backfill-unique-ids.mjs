import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function generateNextUniqueId(role = "USER") {
  let prefix = "H-";
  if (role === "ADMIN") prefix = "A-";
  else if (role === "VENDOR") prefix = "V-";
  else if (role === "COURIER") prefix = "C-";

  const lastUser = await p.user.findFirst({
    where: { uniqueId: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
  });

  let nextNum = 1;
  if (lastUser?.uniqueId) {
    const parts = lastUser.uniqueId.split("-");
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
  }

  let isUnique = false;
  let candidateId = "";
  while (!isUnique) {
    const suffix = nextNum.toString().padStart(5, "0");
    candidateId = prefix + suffix;
    const existing = await p.user.findUnique({
      where: { uniqueId: candidateId },
    });
    if (!existing) isUnique = true;
    else nextNum++;
  }
  return candidateId;
}

async function main() {
  const users = await p.user.findMany();
  for (const u of users) {
    const role = u.role || "USER";
    const expectedPrefix =
      role === "ADMIN" ? "A-" :
      role === "VENDOR" ? "V-" :
      role === "COURIER" ? "C-" : "H-";

    if (!u.uniqueId || !u.uniqueId.startsWith(expectedPrefix)) {
      const newId = await generateNextUniqueId(role);
      await p.user.update({
        where: { id: u.id },
        data: { uniqueId: newId },
      });
      console.log(`Updated user: ${u.name} | Role: ${role} | Old ID: ${u.uniqueId} -> New ID: ${newId}`);
    } else {
      console.log(`User OK: ${u.name} | Role: ${role} | ID: ${u.uniqueId}`);
    }
  }
  console.log("Done.");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});