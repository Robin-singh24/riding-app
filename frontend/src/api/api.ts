import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:3000/v1",
    headers: {
        "Content-Type": "application/json",
    },
});