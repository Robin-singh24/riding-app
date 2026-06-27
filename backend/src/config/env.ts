import { config } from "dotenv";
import { z } from "zod";

config();
// console.log(process.env);
// console.log("REDIS_PORT =", process.env.REDIS_PORT);

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce.number().default(3000),

    DATABASE_URL: z.url(),

    REDIS_PORT: z.coerce.number(),
});

export const env = Object.freeze(envSchema.parse(process.env));