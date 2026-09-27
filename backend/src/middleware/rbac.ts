import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "./error";
import { prisma } from "../config/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Verifies the JWT and attaches the decoded user payload to req.user.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing access token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

// Checks the authenticated user's role has the given permission key(s).
// Usage: requirePermission("patients.create")
export function requirePermission(...permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: req.user.roleId, permission: { key: { in: permissionKeys } } },
      select: { permission: { select: { key: true } } },
    });

    const granted = new Set(rolePermissions.map((rp) => rp.permission.key));
    const hasAll = permissionKeys.every((k) => granted.has(k));

    if (!hasAll) {
      return next(new ForbiddenError(`Missing required permission: ${permissionKeys.join(", ")}`));
    }
    next();
  };
}

// Restricts access to specific role names directly (used sparingly; prefer requirePermission for granular control).
export function requireRole(...roleNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roleNames.includes(req.user.roleName)) {
      return next(new ForbiddenError(`Requires role: ${roleNames.join(" or ")}`));
    }
    next();
  };
}

// Ensures a user can only act within their assigned department, unless they are an Administrator.
export function requireSameDepartment(getDepartmentId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.roleName === "Administrator") return next();

    const targetDeptId = getDepartmentId(req);
    if (targetDeptId && targetDeptId !== req.user.departmentId) {
      return next(new ForbiddenError("Cannot access resources outside your department"));
    }
    next();
  };
}
