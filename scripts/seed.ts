import "./load-env";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db, pool } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import type { Role } from "../src/lib/types";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

async function upsertUser(user: SeedUser) {
  const email = user.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(user.password, 10);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        name: user.name,
        passwordHash,
        role: user.role,
      })
      .where(eq(users.id, existing[0].id));
    console.log(`Updated ${user.role}: ${email}`);
    return;
  }

  await db.insert(users).values({
    name: user.name,
    email,
    passwordHash,
    role: user.role,
  });
  console.log(`Created ${user.role}: ${email}`);
}

async function main() {
  const seedUsers: SeedUser[] = [];

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const controllerEmail = process.env.CONTROLLER_EMAIL;
  const controllerPassword = process.env.CONTROLLER_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed.");
  }
  if (!controllerEmail || !controllerPassword) {
    throw new Error(
      "CONTROLLER_EMAIL and CONTROLLER_PASSWORD must be set to seed.",
    );
  }

  seedUsers.push({
    name: process.env.ADMIN_NAME ?? "Summit Administrator",
    email: adminEmail,
    password: adminPassword,
    role: "admin",
  });
  seedUsers.push({
    name: process.env.CONTROLLER_NAME ?? "Summit Controller",
    email: controllerEmail,
    password: controllerPassword,
    role: "controller",
  });

  for (const user of seedUsers) {
    await upsertUser(user);
  }

  console.log("Seed complete. No event or demo content was created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
