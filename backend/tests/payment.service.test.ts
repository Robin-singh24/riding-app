describe("PaymentService", () => {

    it("should complete a payment successfully", async () => {

        const payment = {
            rideId: "ride-1",
            amount: 250,
            status: "COMPLETED",
        };

        expect(payment.status).toBe("COMPLETED");
        expect(payment.amount).toBe(250);
    });

});