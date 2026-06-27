import {
    PrismaClient,
    Role,
    User,
} from "@prisma/client";

import { prisma } from "../../config/prisma";

type DbClient = PrismaClient;

export class DemoRepository {
    async findUserByRole(
        role: Role,
        db: DbClient = prisma
    ): Promise<User | null> {
        return db.user.findFirst({
            where: {
                role,

                ...(role === Role.DRIVER && {
                    driverProfile: {
                        isNot: null,
                    },
                }),
            },


            orderBy: {
                createdAt: "desc",
            },
        });
    }
}