// Local search signals for metadata, structured data, and the AI reference file.
// Intentionally not rendered as visible page content.
export const homeBase = {
  city: "Atlanta",
  region: "GA",
  regionName: "Georgia",
  country: "US",
  latitude: 33.749,
  longitude: -84.388,
  // Covers metro Atlanta and the surrounding region out to Mobile, AL.
  radiusMeters: 500000,
};

// Metro Atlanta and the surrounding communities, by county.
const metroAtlantaCities = [
  // Fulton
  "Atlanta",
  "Sandy Springs",
  "Roswell",
  "Alpharetta",
  "Milton",
  "Johns Creek",
  "East Point",
  "College Park",
  "Union City",
  "Fairburn",
  "Palmetto",
  "Hapeville",
  "Chattahoochee Hills",
  // Cobb
  "Marietta",
  "Smyrna",
  "Kennesaw",
  "Acworth",
  "Austell",
  "Powder Springs",
  "Mableton",
  "Vinings",
  // DeKalb
  "Decatur",
  "Brookhaven",
  "Dunwoody",
  "Chamblee",
  "Doraville",
  "Tucker",
  "Stone Mountain",
  "Clarkston",
  "Avondale Estates",
  "Lithonia",
  "Stonecrest",
  // Gwinnett
  "Lawrenceville",
  "Duluth",
  "Norcross",
  "Peachtree Corners",
  "Suwanee",
  "Buford",
  "Sugar Hill",
  "Snellville",
  "Lilburn",
  "Grayson",
  "Dacula",
  "Loganville",
  "Berkeley Lake",
  // Clayton
  "Jonesboro",
  "Riverdale",
  "Forest Park",
  "Morrow",
  "Lake City",
  // Henry
  "McDonough",
  "Stockbridge",
  "Hampton",
  "Locust Grove",
  // Cherokee
  "Woodstock",
  "Canton",
  "Holly Springs",
  "Ball Ground",
  // Forsyth
  "Cumming",
  // Douglas
  "Douglasville",
  "Lithia Springs",
  // Paulding
  "Dallas",
  "Hiram",
  // Coweta
  "Newnan",
  "Senoia",
  "Sharpsburg",
  // Fayette
  "Peachtree City",
  "Fayetteville",
  "Tyrone",
  // Rockdale, Newton, Walton, Spalding, Barrow, Bartow, Carroll, Hall
  "Conyers",
  "Covington",
  "Oxford",
  "Social Circle",
  "Monroe",
  "Winder",
  "Braselton",
  "Griffin",
  "Jackson",
  "Cartersville",
  "Villa Rica",
  "Carrollton",
  "Flowery Branch",
  "Gainesville",
  "Buckhead",
];

// Cities beyond metro Atlanta where projects are regularly supported.
const regionalCities = [
  ["Macon", "GA"],
  ["Warner Robins", "GA"],
  ["Augusta", "GA"],
  ["Valdosta", "GA"],
  ["Columbus", "GA"],
  ["Albany", "GA"],
  ["Athens", "GA"],
  ["Savannah", "GA"],
  ["Rome", "GA"],
  ["Dalton", "GA"],
  ["LaGrange", "GA"],
  ["Chattanooga", "TN"],
  ["Knoxville", "TN"],
  ["Nashville", "TN"],
  ["Montgomery", "AL"],
  ["Mobile", "AL"],
  ["Birmingham", "AL"],
  ["Huntsville", "AL"],
  ["Auburn", "AL"],
  ["Dothan", "AL"],
];

export const serviceAreas = [
  ...metroAtlantaCities.map((city) => ({ city, region: "GA" })),
  ...regionalCities.map(([city, region]) => ({ city, region })),
];

// States covered on the ground, plus remote work anywhere in the country.
export const servedRegions = [
  { name: "Georgia", region: "GA" },
  { name: "Alabama", region: "AL" },
  { name: "Tennessee", region: "TN" },
];

export const servedCountry = "United States";
