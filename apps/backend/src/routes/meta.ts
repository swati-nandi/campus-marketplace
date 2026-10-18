import { Router } from "express";
import * as listings from "../services/listingService";
import { asyncHandler } from "../utils/httpError";

const router = Router();

router.get("/categories", asyncHandler(async (_req, res) => {
  res.json({ items: await listings.listCategories() });
}));

router.get("/locations", asyncHandler(async (_req, res) => {
  res.json({ items: await listings.listLocations() });
}));

export default router;