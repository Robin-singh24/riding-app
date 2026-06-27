import { MockPspProvider } from "./mockPspProvider";
import { PspProvider } from "./psp.interface";

export class PspFactory {
    static getProvider(): PspProvider {
        return new MockPspProvider();
    }
}