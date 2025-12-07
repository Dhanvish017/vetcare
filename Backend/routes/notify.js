const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://vetcare-peach.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const notifyRoutes = require("./routes/notify");
app.use("/api/notify", notifyRoutes);

