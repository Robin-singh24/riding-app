export class ApiResponse<T> {
    public readonly success: boolean;
    public readonly message: string;
    public readonly data: T | null;

    constructor(message: string, data: T | null = null) {
        this.success = true;
        this.message = message;
        this.data = data;
    }
}