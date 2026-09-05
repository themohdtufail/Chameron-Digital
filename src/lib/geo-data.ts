export interface CityData {
  city: string;
  state: string;
  areas: string[];
}

// A small curated set for the manual-selection fallback. In production this
// would be backed by a proper places/geocoding service.
export const CITIES: CityData[] = [
  {
    city: "Jammu",
    state: "Jammu and Kashmir",
    areas: ["Gandhi Nagar", "Trikuta Nagar", "Channi Himmat", "Bahu Plaza", "Rehari"],
  },
  {
    city: "Srinagar",
    state: "Jammu and Kashmir",
    areas: ["Lal Chowk", "Rajbagh", "Hazratbal", "Bemina"],
  },
  {
    city: "Delhi",
    state: "Delhi",
    areas: ["Connaught Place", "Karol Bagh", "Dwarka", "Saket", "Rohini"],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    areas: ["Andheri", "Bandra", "Dadar", "Powai", "Borivali"],
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    areas: ["Koramangala", "Indiranagar", "Whitefield", "Jayanagar"],
  },
  {
    city: "Chandigarh",
    state: "Chandigarh",
    areas: ["Sector 17", "Sector 22", "Sector 35", "Manimajra"],
  },
  {
    city: "Amritsar",
    state: "Punjab",
    areas: ["Ranjit Avenue", "Lawrence Road", "Hall Bazaar"],
  },
];

export function findCity(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES;
  return CITIES.filter((c) => c.city.toLowerCase().includes(q));
}
