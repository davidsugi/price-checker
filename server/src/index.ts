import express from "express";
import cors from "cors";
import resolveRouter from "./routes/resolve";
import mappingRouter from "./routes/mapping";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", resolveRouter);
app.use("/api", mappingRouter);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
