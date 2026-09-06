import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/notify";

describe("renderTemplate", () => {
  it("substitutes every matching placeholder", () => {
    const result = renderTemplate(
      { title: "Order {{orderNumber}}", body: "Hi {{name}}, your order {{orderNumber}} is {{status}}." },
      { orderNumber: "CD-123", name: "Aisha", status: "confirmed" }
    );
    expect(result).toEqual({
      title: "Order CD-123",
      body: "Hi Aisha, your order CD-123 is confirmed.",
    });
  });

  it("leaves an unmatched placeholder untouched rather than blanking it", () => {
    const result = renderTemplate({ title: "Hi {{name}}", body: "{{missing}}" }, { name: "Aisha" });
    expect(result).toEqual({ title: "Hi Aisha", body: "{{missing}}" });
  });

  it("substitutes numeric vars as strings", () => {
    const result = renderTemplate({ title: "Stock alert", body: "{{stock}} left" }, { stock: 3 });
    expect(result.body).toBe("3 left");
  });

  it("handles an empty-string var (e.g. an optional trailing reason)", () => {
    const result = renderTemplate({ title: "Cancelled", body: "Order {{orderNumber}} cancelled.{{reason}}" }, {
      orderNumber: "CD-1",
      reason: "",
    });
    expect(result.body).toBe("Order CD-1 cancelled.");
  });

  it("is a no-op when the template has no placeholders", () => {
    const result = renderTemplate({ title: "Static", body: "No tokens here" }, { unused: "x" });
    expect(result).toEqual({ title: "Static", body: "No tokens here" });
  });
});
