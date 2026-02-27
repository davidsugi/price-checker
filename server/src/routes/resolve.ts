import { Router, type Request, type Response } from "express";
import { isValidCardType } from "../types";
import { readMapping, writeMapping } from "../utils/fileStore";

const router = Router();

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

router.post("/resolve", (req: Request, res: Response) => {
  const { cardName, cardType, override } = req.body ?? {};

  if (!cardName || typeof cardName !== "string") {
    res.status(400).json({ error: "cardName is required" });
    return;
  }

  if (!cardType || !isValidCardType(cardType)) {
    res.status(400).json({ error: "Invalid cardType" });
    return;
  }

  const normalized = normalize(cardName);
  const mapping = readMapping();

  const trimmedOverride =
    typeof override === "string" ? override.trim() : "";

  if (trimmedOverride) {
    mapping[cardType][normalized] = trimmedOverride;
    writeMapping(mapping);
    res.json({ japanese: trimmedOverride });
    return;
  }

  if (mapping[cardType][normalized]) {
    res.json({ japanese: mapping[cardType][normalized] });
    return;
  }

  res.json({ japanese: null });
});

export default router;
