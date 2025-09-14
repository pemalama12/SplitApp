import express from "express";
import { connectDB } from "./db/connectDB.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import responseFormatter from "./middleware/responseFormatter.js";
import groupRoutes from "./routes/group.routes.js";
import expenseRoutes from "./routes/expense.route.js";
dotenv.config();

const app = express();
app.use(responseFormatter);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("API is working!");
});
// Middle Ware
app.use(express.json()); // allows us to parse incoming requests : req.body
app.use(cookieParser()); // allows user to parse incoming cookies
app.use("/api/auth", authRoutes);
app.use("/group", groupRoutes);
app.use("/expense", expenseRoutes);

async function bootstrap() {
  try {
    app.listen(PORT, () => {
      connectDB();
      console.log(`server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

bootstrap();
