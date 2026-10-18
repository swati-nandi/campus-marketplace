import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as listings from "../services/listingService";
import { asyncHandler } from "../utils/httpError";
import { idSchema, listingQuerySchema, listingSchema } from "../validators/schemas";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  res.json(await listings.searchListings(listingQuerySchema.parse(req.query)));
}));

// Must be declared before "/:id"
router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await listings.myListings(req.user!.id) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  res.json({ listing: await listings.getListing(idSchema.parse(req.params.id)) });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const listing = await listings.createListing(req.user!.id, listingSchema.parse(req.body));
  res.status(201).json({ listing });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  const listing = await listings.updateListing(
    idSchema.parse(req.params.id), req.user!.id, req.user!.role, listingSchema.parse(req.body)
  );
  res.json({ listing });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  await listings.deleteListing(idSchema.parse(req.params.id), req.user!.id, req.user!.role);
  res.json({ ok: true });
}));

export default router;