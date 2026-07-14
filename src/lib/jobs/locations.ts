/**
 * Local location database for the Jobs "Edit filters" location field.
 *
 * The location suggestions come from this static list (NOT from AI), using the
 * display formats agreed in the spec:
 *   - State:   "California, US"
 *   - City:    "Los Angeles, CA (US)"
 *   - Country: "United States"
 */

/** US states as "{State}, US". */
const US_STATES: string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming", "Washington, D.C.",
].map((s) => `${s}, US`);

/** Major US cities as "{City}, {ST} (US)". */
const US_CITIES: string[] = [
  ["New York", "NY"], ["Los Angeles", "CA"], ["Chicago", "IL"],
  ["Houston", "TX"], ["Phoenix", "AZ"], ["Philadelphia", "PA"],
  ["San Antonio", "TX"], ["San Diego", "CA"], ["Dallas", "TX"],
  ["San Jose", "CA"], ["Austin", "TX"], ["Jacksonville", "FL"],
  ["Fort Worth", "TX"], ["Columbus", "OH"], ["Charlotte", "NC"],
  ["San Francisco", "CA"], ["Indianapolis", "IN"], ["Seattle", "WA"],
  ["Denver", "CO"], ["Boston", "MA"], ["Nashville", "TN"],
  ["Portland", "OR"], ["Las Vegas", "NV"], ["Detroit", "MI"],
  ["Memphis", "TN"], ["Miami", "FL"], ["Atlanta", "GA"],
  ["Minneapolis", "MN"], ["Tampa", "FL"], ["Orlando", "FL"],
  ["Pittsburgh", "PA"], ["Cincinnati", "OH"], ["Sacramento", "CA"],
  ["Kansas City", "MO"], ["Raleigh", "NC"], ["Salt Lake City", "UT"],
].map(([city, st]) => `${city}, ${st} (US)`);

/** Countries as "{Country}". */
const COUNTRIES: string[] = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Ireland", "India",
  "Singapore", "United Arab Emirates", "Japan", "Brazil", "Mexico",
  "Sweden", "Switzerland", "Poland", "Portugal", "New Zealand",
  "South Africa", "Philippines", "Indonesia", "Malaysia",
];

/** Major world cities as "{City}, {Country}". */
const WORLD_CITIES: string[] = [
  "London, UK", "Manchester, UK", "Toronto, Canada", "Vancouver, Canada",
  "Sydney, Australia", "Melbourne, Australia", "Berlin, Germany",
  "Munich, Germany", "Paris, France", "Madrid, Spain", "Barcelona, Spain",
  "Amsterdam, Netherlands", "Dublin, Ireland", "Bangalore, India",
  "Mumbai, India", "Singapore, Singapore", "Dubai, UAE", "Tokyo, Japan",
  "Toronto, ON (Canada)", "Berlin, Germany",
];

/** The full location list, most-specific groups first for nicer ordering. */
const ALL_LOCATIONS: string[] = Array.from(
  new Set([...US_CITIES, ...WORLD_CITIES, ...US_STATES, ...COUNTRIES])
);

/** Lowercase + strip diacritics for matching. */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * Search the local location database. Returns display-formatted matches
 * (prefix matches first), excluding anything already selected.
 */
export function searchLocations(
  query: string,
  exclude: string[] = [],
  limit = 7
): string[] {
  const q = fold(query.trim());
  if (!q) return [];
  const excluded = new Set(exclude.map((e) => fold(e)));
  return ALL_LOCATIONS.filter((loc) => fold(loc).includes(q) && !excluded.has(fold(loc)))
    .sort((a, b) => Number(fold(b).startsWith(q)) - Number(fold(a).startsWith(q)))
    .slice(0, limit);
}
