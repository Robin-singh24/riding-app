import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import rideRoutes from "./modules/ride/ride.routes";
import driverRoutes from "./modules/driver/driver.routes";
import tripRoutes from "./modules/trip/trip.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import demoRoutes from "./modules/demo/demo.routes";

const app = express();

// Security
app.use(helmet());

// Compression
app.use(compression());

// CORS
app.use(cors());

// Body Parsing
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy",
    });
});


// Routes
app.use("/v1/rides", rideRoutes);
app.use("/v1/drivers", driverRoutes);
app.use("/v1/trips", tripRoutes);
app.use("/v1/payments", paymentRoutes);
app.use("/v1/demo", demoRoutes);


// 404
app.use(notFound);


// Global Error Handler
app.use(errorHandler);

export default app;