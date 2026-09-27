import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema";
import * as authService from "./auth.service";

export const authRouter = Router();

// ── Public: self-registration ─────────────────────────────────────────────
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({
      message: "Registration submitted. You will receive an email once an administrator reviews your account.",
      user: result,
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, req.ip);
    res.json(result);
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).send();
  })
);
