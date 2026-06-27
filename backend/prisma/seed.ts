import { DriverStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";

import { prisma } from "../src/config/prisma";

async function main() {
    const hashedPassword = await bcrypt.hash(
        "Password@123",
        10
    );

    // Rider
    await prisma.user.upsert({
        where: {
            email: "robin.rider@gocomet.com",
        },
        update: {},
        create: {
            fullName: "Robin Rider",
            email: "robin.rider@gocomet.com",
            password: hashedPassword,
            role: Role.RIDER,
        },
    });

    // Driver
    await prisma.user.upsert({
        where: {
            email: "john.driver@gocomet.com",
        },
        update: {},
        create: {
            fullName: "John Driver",
            email: "john.driver@gocomet.com",
            password: hashedPassword,
            role: Role.DRIVER,
            driverProfile: {
                create: {
                    vehicleNumber: "KA01AB1234",
                    vehicleType: "Sedan",
                    licenseNumber: "DL123456789",
                    status: DriverStatus.ONLINE,
                },
            },
        },
    });

    console.log("✅ Database seeded successfully.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });