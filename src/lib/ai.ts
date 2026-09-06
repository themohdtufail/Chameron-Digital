export type AITask =
  | {
      kind: "product_description";
      product: { name: string; category?: string | null; price: number; attributes?: Record<string, string> };
    }
  | { kind: "marketing_content"; storeName: string; occasion?: string; highlight?: string }
  | {
      kind: "business_insights";
      metrics: {
        revenue: number;
        orders: number;
        previousRevenue: number;
        topProductName?: string;
        lowStockCount: number;
      };
    };

export interface AIProvider {
  generate(task: AITask): Promise<string>;
}

function formatRupees(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * Deterministic, no-network provider — no LLM API key exists in this
 * sandbox, so this fills structured templates from the real data passed
 * in rather than calling out. A real OpenAI/Claude provider swaps in
 * later as a new class selected by AI_PROVIDER in getAIProvider(); no
 * call site changes, since both implement the same generate(task) seam.
 */
class TemplateAIProvider implements AIProvider {
  async generate(task: AITask): Promise<string> {
    switch (task.kind) {
      case "product_description":
        return this.productDescription(task.product);
      case "marketing_content":
        return this.marketingContent(task);
      case "business_insights":
        return this.businessInsights(task.metrics);
    }
  }

  private productDescription(product: { name: string; category?: string | null; price: number; attributes?: Record<string, string> }) {
    const attrEntries = Object.entries(product.attributes ?? {}).filter(([, v]) => v.trim());
    const attrPhrase = attrEntries.length
      ? ` Featuring ${attrEntries.map(([k, v]) => `${k.toLowerCase()}: ${v}`).join(", ")}.`
      : "";
    const categoryPhrase = product.category ? ` from our ${product.category} collection` : "";

    return (
      `Discover the ${product.name}${categoryPhrase} — crafted for quality and everyday value.` +
      `${attrPhrase} Priced at just ${formatRupees(product.price)}, it's a smart pick you won't want to miss. ` +
      `Order now for fast delivery.`
    );
  }

  private marketingContent(task: { storeName: string; occasion?: string; highlight?: string }) {
    const occasion = task.occasion?.trim() || "Special";
    const highlight = task.highlight?.trim() || "great deals across the store";
    return (
      `🎉 ${occasion} Sale at ${task.storeName}! Enjoy ${highlight} for a limited time. ` +
      `Shop now before it's gone — your favorites are waiting!`
    );
  }

  private businessInsights(metrics: {
    revenue: number;
    orders: number;
    previousRevenue: number;
    topProductName?: string;
    lowStockCount: number;
  }) {
    const growthPercent =
      metrics.previousRevenue > 0
        ? Math.round(((metrics.revenue - metrics.previousRevenue) / metrics.previousRevenue) * 1000) / 10
        : null;

    const sentences: string[] = [];
    sentences.push(`You made ${formatRupees(metrics.revenue)} from ${metrics.orders} order${metrics.orders === 1 ? "" : "s"} this period.`);

    if (growthPercent !== null) {
      sentences.push(
        growthPercent >= 0
          ? `That's up ${growthPercent}% from the previous period — keep the momentum going!`
          : `That's down ${Math.abs(growthPercent)}% from the previous period. Consider running a coupon to bring buyers back.`
      );
    }

    if (metrics.topProductName) {
      sentences.push(`Your best seller right now is ${metrics.topProductName} — feature it prominently or bundle it with slower movers.`);
    }

    if (metrics.lowStockCount > 0) {
      sentences.push(`${metrics.lowStockCount} product${metrics.lowStockCount === 1 ? " is" : "s are"} running low on stock — restock soon to avoid missed sales.`);
    }

    return sentences.join(" ");
  }
}

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (provider) return provider;
  // AI_PROVIDER=openai|claude would select a real driver here once an API
  // key exists; only "template" is implemented today.
  provider = new TemplateAIProvider();
  return provider;
}
