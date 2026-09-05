export interface StoreSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  categoryName: string | null;
  ratingAvg: number;
  ratingCount: number;
  city: string;
  area: string | null;
  distanceKm: number | null;
  isOpenNow: boolean;
  deliveryAvailable: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  status: "AVAILABLE" | "OUT_OF_STOCK" | "HIDDEN";
  imageUrl: string | null;
  storeSlug?: string;
  storeName?: string;
}
