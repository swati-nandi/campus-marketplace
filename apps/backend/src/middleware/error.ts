import { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

// Every error response has the shape { error: string, details?: ... }
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  if (typeof err?.code === "string" && /^[0-9A-Z]{5}$/.test(err.code)) {
    switch (err.code) {
      case "23505":
        res.status(409).json({ error: "Duplicate record" });
        return;
      case "23503":
        res.status(400).json({ error: "Referenced record does not exist" });
        return;
      case "23514":
        // Trigger-raised messages are ours and safe to show; CHECK violations carry a constraint name.
        res.status(400).json({ error: err.constraint ? "Data violates a database rule" : err.message });
        return;
      case "23P01":
        res.status(409).json({ error: "Conflicts with an existing booking" });
        return;
      case "22P02":
        res.status(400).json({ error: "Invalid input format" });
        return;
    }
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};