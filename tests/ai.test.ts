import { describe, it, expect } from "vitest";
import { getAIProvider, type AIProvider, type AITask } from "@/lib/ai";

describe("TemplateAIProvider", () => {
  it("weaves the product's real name, category, price, and attributes into the description", async () => {
    const text = await getAIProvider().generate({
      kind: "product_description",
      product: { name: "Classic Cotton Shirt", category: "Fashion", price: 999, attributes: { Color: "Blue", Size: "M" } },
    });
    expect(text).toContain("Classic Cotton Shirt");
    expect(text).toContain("Fashion");
    expect(text).toContain("999");
    expect(text.toLowerCase()).toContain("color");
  });

  it("still produces a coherent description with no category or attributes", async () => {
    const text = await getAIProvider().generate({
      kind: "product_description",
      product: { name: "Widget", price: 100 },
    });
    expect(text).toContain("Widget");
    expect(text.length).toBeGreaterThan(20);
  });

  it("includes the store name and occasion in marketing content", async () => {
    const text = await getAIProvider().generate({
      kind: "marketing_content",
      storeName: "Jafson Jammu",
      occasion: "Diwali",
      highlight: "20% off",
    });
    expect(text).toContain("Jafson Jammu");
    expect(text).toContain("Diwali");
    expect(text).toContain("20% off");
  });

  it("reports growth when revenue increased over the previous period", async () => {
    const text = await getAIProvider().generate({
      kind: "business_insights",
      metrics: { revenue: 2000, orders: 5, previousRevenue: 1000, lowStockCount: 0 },
    });
    expect(text).toMatch(/up 100%/);
  });

  it("reports a decline and suggests a coupon when revenue dropped", async () => {
    const text = await getAIProvider().generate({
      kind: "business_insights",
      metrics: { revenue: 500, orders: 2, previousRevenue: 1000, lowStockCount: 0 },
    });
    expect(text).toMatch(/down 50%/);
    expect(text.toLowerCase()).toContain("coupon");
  });

  it("mentions low stock when there is any", async () => {
    const text = await getAIProvider().generate({
      kind: "business_insights",
      metrics: { revenue: 1000, orders: 3, previousRevenue: 1000, lowStockCount: 2 },
    });
    expect(text.toLowerCase()).toContain("low on stock");
  });
});

describe("AIProvider seam", () => {
  it("is swappable — a second provider implementing the same interface works with the same call sites", async () => {
    class FakeAIProvider implements AIProvider {
      async generate(task: AITask): Promise<string> {
        return `fake:${task.kind}`;
      }
    }

    async function useProvider(provider: AIProvider, task: AITask) {
      return provider.generate(task);
    }

    const fake = new FakeAIProvider();
    const result = await useProvider(fake, { kind: "marketing_content", storeName: "Test Store" });
    expect(result).toBe("fake:marketing_content");
  });
});
