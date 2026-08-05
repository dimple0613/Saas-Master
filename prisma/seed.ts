import "dotenv/config";
import { PrismaClient, PlatformRole, OrgRole, SubscriptionStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { seedPermissionsAndRoles } from "../lib/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function randomDay(monthsAgo_: number): Date {
  const base = monthsAgo(monthsAgo_);
  base.setDate(Math.floor(Math.random() * 28) + 1);
  return base;
}

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  await seedPermissionsAndRoles();

  // ── Users ──────────────────────────────────────────────
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      password: hash,
      firstName: "Super",
      lastName: "Admin",
      orgName: "Platform",
      role: PlatformRole.superadmin,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hash,
      firstName: "Jane",
      lastName: "Smith",
      orgName: "Acme Corp",
      role: PlatformRole.admin,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: hash,
      firstName: "John",
      lastName: "Doe",
      orgName: "Acme Corp",
      role: PlatformRole.user,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      email: "member@example.com",
      password: hash,
      firstName: "Alice",
      lastName: "Johnson",
      orgName: "Acme Corp",
      role: PlatformRole.user,
    },
  });

  const users = [
    { email: "bob.wilson@example.com", firstName: "Bob", lastName: "Wilson" },
    { email: "carol.lee@example.com", firstName: "Carol", lastName: "Lee" },
    { email: "dave.brown@example.com", firstName: "Dave", lastName: "Brown" },
    { email: "emma.davis@example.com", firstName: "Emma", lastName: "Davis" },
    { email: "frank.miller@example.com", firstName: "Frank", lastName: "Miller" },
    { email: "grace.taylor@example.com", firstName: "Grace", lastName: "Taylor" },
    { email: "henry.anderson@example.com", firstName: "Henry", lastName: "Anderson" },
    { email: "irene.thomas@example.com", firstName: "Irene", lastName: "Thomas" },
    { email: "jack.martin@example.com", firstName: "Jack", lastName: "Martin" },
    { email: "kate.garcia@example.com", firstName: "Kate", lastName: "Garcia" },
    { email: "leo.martinez@example.com", firstName: "Leo", lastName: "Martinez" },
    { email: "mia.robinson@example.com", firstName: "Mia", lastName: "Robinson" },
  ];

  const extraUsers = [];
  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: PlatformRole.user,
      },
    });
    extraUsers.push(created);
  }

  const allUsers = [superadmin, adminUser, regularUser, memberUser, ...extraUsers];

  // ── Organizations ──────────────────────────────────────
  const orgData = [
    { name: "Acme Corp", description: "Leading technology solutions provider" },
    { name: "Globex Inc", description: "Global retail and e-commerce company" },
    { name: "Initech", description: "Enterprise software and consulting" },
    { name: "Umbrella Labs", description: "Biotech research and development" },
    { name: "Stark Industries", description: "Advanced manufacturing and innovation" },
  ];

  const orgs = [];
  for (let i = 0; i < orgData.length; i++) {
    const owner = allUsers[i % allUsers.length];
    const org = await prisma.organization.create({
      data: {
        name: orgData[i].name,
        description: orgData[i].description,
        ownerUserId: owner.id,
        createdAt: monthsAgo(11 - i),
      },
    });
    orgs.push(org);
  }

  // ── Org Members ────────────────────────────────────────
  const memberships: { orgId: number; userId: number; role: OrgRole; createdAt: Date }[] = [];
  for (let i = 0; i < orgs.length; i++) {
    const owner = allUsers[i % allUsers.length];
    memberships.push({ orgId: orgs[i].id, userId: owner.id, role: OrgRole.admin, createdAt: monthsAgo(11 - i) });

    const memberCount = i < 3 ? 4 + i : 3;
    for (let j = 1; j <= memberCount; j++) {
      const user = allUsers[(i + j) % allUsers.length];
      const role = j === 1 ? OrgRole.admin : OrgRole.member;
      memberships.push({ orgId: orgs[i].id, userId: user.id, role, createdAt: monthsAgo(10 - i) });
    }
  }

  await prisma.orgMember.createMany({ data: memberships, skipDuplicates: true });

  // ── Profile Data ───────────────────────────────────────
  const profileFields = [
    { title: "Company Size", values: ["1-10", "11-50", "51-200", "201-500", "500+"] },
    { title: "Industry", values: ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing"] },
    { title: "Revenue", values: ["<$1M", "$1M-$10M", "$10M-$50M", "$50M-$100M", "$100M+"] },
    { title: "Founded", values: ["2015", "2010", "2005", "2000", "1995"] },
    { title: "Headquarters", values: ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Chicago, IL"] },
    { title: "Employees", values: ["15", "60", "250", "1200", "5000"] },
    { title: "Funding Stage", values: ["Seed", "Series A", "Series B", "Series C", "Public"] },
    { title: "Tech Stack", values: ["React, Node.js", "Python, Django", "Go, Kubernetes", "Java, Spring", ".NET, Azure"] },
  ];

  const profileDataEntries: { orgId: number; title: string; content: string; createdBy: number; createdAt: Date }[] = [];
  for (let i = 0; i < orgs.length; i++) {
    const owner = allUsers[i % allUsers.length];
    for (const field of profileFields) {
      profileDataEntries.push({
        orgId: orgs[i].id,
        title: field.title,
        content: field.values[i % field.values.length],
        createdBy: owner.id,
        createdAt: monthsAgo(10 - i),
      });
    }
  }

  await prisma.orgProfileData.createMany({ data: profileDataEntries, skipDuplicates: true });

  // ── Activity Logs (spread over 12 months for charts) ───
  const actions = [
    "Created profile record",
    "Updated company info",
    "Invited team member",
    "Viewed dashboard",
    "Exported report",
    "Modified settings",
    "Uploaded document",
    "Commented on record",
    "Reviewed analytics",
    "Managed team members",
  ];

  const activityEntries: { orgId: number | null; userId: number; action: string; details: string; createdAt: Date }[] = [];

  for (let month = 0; month < 12; month++) {
    const numActivities = 5 + Math.floor(Math.random() * 15);
    for (let j = 0; j < numActivities; j++) {
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const org = orgs[Math.floor(Math.random() * orgs.length)];

      activityEntries.push({
        orgId: org.id,
        userId: user.id,
        action,
        details: `${action} in ${org.name}`,
        createdAt: randomDay(month),
      });
    }

    // Platform-wide activity (no org)
    if (Math.random() > 0.5) {
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      activityEntries.push({
        orgId: null,
        userId: user.id,
        action: "Platform login",
        details: `${user.firstName} ${user.lastName} logged in`,
        createdAt: randomDay(month),
      });
    }
  }

  await prisma.activityLog.createMany({ data: activityEntries });

  // ── Invitations ────────────────────────────────────────
  const inviteEmails = [
    "new hire1@example.com",
    "contractor1@example.com",
    "consultant1@example.com",
    "partner1@example.com",
    "intern1@example.com",
  ];

  for (let i = 0; i < Math.min(inviteEmails.length, orgs.length); i++) {
    const owner = allUsers[i % allUsers.length];
    const rawToken = `inv_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
    await prisma.invitation
      .create({
        data: {
          orgId: orgs[i].id,
          email: inviteEmails[i],
          tokenHash: createHash("sha256").update(rawToken).digest("hex"),
          role: OrgRole.member,
          invitedBy: owner.id,
          createdAt: monthsAgo(2),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          used: i < 2,
        },
      })
      .catch(() => {});
  }

  // ── Plans & subscriptions ──────────────────────────────
  const plansData = [
    {
      name: "Free",
      slug: "free",
      description: "For individuals and small teams getting started",
      priceMonthly: 0,
      features: [
        { key: "members", label: "Team members", value: "5" },
        { key: "storage", label: "Storage", value: "1 GB" },
        { key: "profiles", label: "Profile records", value: "50" },
      ],
    },
    {
      name: "Pro",
      slug: "pro",
      description: "For growing teams that need the full toolkit",
      priceMonthly: 49,
      features: [
        { key: "members", label: "Team members", value: "25" },
        { key: "storage", label: "Storage", value: "25 GB" },
        { key: "profiles", label: "Profile records", value: "Unlimited" },
        { key: "advanced_reports", label: "Advanced reports", value: "Enabled" },
      ],
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "For organizations with advanced security & support",
      priceMonthly: 199,
      features: [
        { key: "members", label: "Team members", value: "Unlimited" },
        { key: "storage", label: "Storage", value: "Unlimited" },
        { key: "profiles", label: "Profile records", value: "Unlimited" },
        { key: "audit_logs", label: "Audit logs", value: "Enabled" },
        { key: "priority_support", label: "Priority support", value: "24/7" },
      ],
    },
  ];

  const plans = [];
  for (const p of plansData) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        isActive: true,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceMonthly: p.priceMonthly,
        isActive: true,
      },
    });
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
    await prisma.planFeature.createMany({
      data: p.features.map((f) => ({ ...f, planId: plan.id })),
    });
    plans.push(plan);
  }

  for (let i = 0; i < orgs.length; i++) {
    const plan = i < 3 ? plans[1] : plans[0];
    await prisma.subscription
      .upsert({
        where: { orgId: orgs[i].id },
        update: { planId: plan.id, status: SubscriptionStatus.active },
        create: {
          orgId: orgs[i].id,
          planId: plan.id,
          status: SubscriptionStatus.active,
          startsAt: monthsAgo(10 - i),
        },
      })
      .catch(() => {});
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Users:");
  console.log("  superadmin@example.com / password123 (superadmin)");
  console.log("  admin@example.com      / password123 (admin)");
  console.log("  user@example.com       / password123 (user)");
  console.log("  member@example.com     / password123 (user)");
  for (const u of extraUsers) {
    console.log(`  ${u.email.padEnd(24)} / password123 (user)`);
  }
  console.log(`\nOrganizations: ${orgs.length}`);
  console.log(`Memberships: ${memberships.length}`);
  console.log(`Profile records: ${profileDataEntries.length}`);
  console.log(`Activity log entries: ${activityEntries.length}`);
  console.log(`Plans: ${plans.length} (${plans.map((p) => p.slug).join(", ")})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
