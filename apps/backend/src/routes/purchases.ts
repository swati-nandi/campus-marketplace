import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as purchases from "../services/purchaseService";
import { asyncHandler } from "../utils/httpError";
import { idSchema, purchaseRequestSchema } from "../validators/schemas";

// Mounted at /api. Auth is applied per route so unknown paths still return 404.
const router = Router();

router.post("/listings/:id/requests", requireAuth, asyncHandler(async (req, res) => {
  const { message } = purchaseRequestSchema.parse(req.body ?? {});
  const request = await purchases.createRequest(req.user!.id, idSchema.parse(req.params.id), message);
  res.status(201).json({ request });
}));

router.get("/requests/incoming", requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await purchases.listIncoming(req.user!.id) });
}));

router.get("/requests/outgoing", requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await purchases.listOutgoing(req.user!.id) });
}));

router.post("/requests/:id/accept", requireAuth, asyncHandler(async (req, res) => {
  res.json({ transaction: await purchases.acceptRequest(req.user!.id, idSchema.parse(req.params.id)) });
}));

router.post("/requests/:id/reject", requireAuth, asyncHandler(async (req, res) => {
  res.json({ request: await purchases.rejectRequest(req.user!.id, idSchema.parse(req.params.id)) });
}));

router.post("/requests/:id/cancel", requireAuth, asyncHandler(async (req, res) => {
  res.json({ request: await purchases.cancelRequest(req.user!.id, idSchema.parse(req.params.id)) });
}));

router.get("/transactions", requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await purchases.listTransactions(req.user!.id) });
}));

router.post("/transactions/:id/complete", requireAuth, asyncHandler(async (req, res) => {
  res.json({ transaction: await purchases.completeTransaction(req.user!.id, idSchema.parse(req.params.id)) });
}));

router.post("/transactions/:id/cancel", requireAuth, asyncHandler(async (req, res) => {
  res.json({ transaction: await purchases.cancelTransaction(req.user!.id, idSchema.parse(req.params.id)) });
}));

export default router;