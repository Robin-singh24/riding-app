import { api } from "../api/api";

export interface DemoUser {
    id: string;
    fullName: string;
    role: string;
}

export interface DemoUsersResponse {
    rider: DemoUser;
    driver: DemoUser;
}

export async function getDemoUsers(): Promise<DemoUsersResponse> {
    const response = await api.get("/demo/users");

    return response.data.data;
}