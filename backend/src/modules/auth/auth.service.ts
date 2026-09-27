import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { UnauthorizedError, ConflictError } from "../../middleware/error";
import { sendMail } from "../../utils/mailer";
import { registrationReceivedEmail } from "../../utils/email-templates";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// ── Self-registration (status = PENDING until admin approves) ─────────────

export async function register(data: {
  fullName: string;
  email: string;
  password: string;
  roleName: string;
  departmentId?: string;
  registrationNote?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const role = await prisma.role.findUnique({ where: { name: data.roleName } });
  if (!role) throw new ConflictError("Selected role does not exist");

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName:         data.fullName,
      email:            data.email,
      passwordHash,
      roleId:           role.id,
      departmentId:     data.departmentId,
      registrationNote: data.registrationNote,
      status:           "PENDING",   // must be approved by admin before login
    },
    include: { role: true },
  });

  // Notify the applicant that their request is received
  await sendMail({
    to:      user.email,
    subject: `Registration received — ${data.roleName} account pending review`,
    html:    registrationReceivedEmail({ fullName: user.fullName, role: role.name }),
  });

  return {
    id:       user.id,
    email:    user.email,
    fullName: user.fullName,
    role:     role.name,
    status:   user.status,
  };
}

export async function login(email: string, password: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    roleId: user.roleId,
    roleName: user.role.name,
    departmentId: user.departmentId,
  });
  const refreshToken = signRefreshToken(user.id);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({
      data: { userId: user.id, action: "LOGIN", ipAddress },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      departmentId: user.departmentId,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token revoked or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("User no longer active");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    roleId: user.roleId,
    roleName: user.role.name,
    departmentId: user.departmentId,
  });

  return { accessToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });
}
