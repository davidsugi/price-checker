import { Router, type Request, type Response } from "express";
import { readMapping } from "../utils/fileStore";

const router = Router();

router.get("/mapping", (_req: Request, res: Response) => {
  const mapping = readMapping();
  res.json(mapping);
});

export default router;
