/** Static suggestion lists for the autocomplete inputs (no AI needed). */

export const JOB_TITLES = [
  "Account Manager", "Sales Manager", "Sales Manager Motor Trade", "Sales Manager Motor Dealership",
  "Travel Sales Manager", "Tourism Sales Manager", "Marketing Manager", "Senior Marketing Manager",
  "Product Manager", "Project Manager", "Business Analyst", "Data Analyst", "Data Scientist",
  "Software Engineer", "Senior Software Engineer", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "UX Designer", "UI Designer", "Graphic Designer", "Operations Manager",
  "Office Manager", "Human Resources Manager", "Recruiter", "Financial Analyst", "Accountant",
  "Customer Success Manager", "Content Writer", "Copywriter", "Social Media Manager",
  "Digital Marketing Specialist", "SEO Specialist", "Administrative Assistant", "Executive Assistant",
  "Teacher", "Nurse", "Consultant", "Chief Executive Officer", "Chief Technology Officer",
];

export const LOCATIONS = [
  "Los Angeles", "East Los Angeles", "Los Ángeles", "New York", "San Francisco", "Chicago",
  "Houston", "Seattle", "Boston", "Austin", "Denver", "Atlanta", "Miami", "Washington, D.C.",
  "Cupertino, CA", "Menlo Park, CA", "London", "Manchester", "Toronto", "Vancouver", "Sydney",
  "Melbourne", "Berlin", "Munich", "Paris", "Amsterdam", "Dublin", "Singapore", "Tokyo",
  "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Dubai", "Madrid", "Barcelona", "Rome", "Lisbon",
];

/**
 * Locations for the contact section, written the way a resume header reads:
 * "City, State (Country)" where a state disambiguates, "City, Country" otherwise.
 * Ordered so a single-letter query still surfaces the places people actually
 * live - typing "W" yields Washington, Wisconsin, West Virginia, and so on.
 */
export const LOCATION_SUGGESTIONS = [
  // United States - cities
  "Washington, DC (US)", "New York, NY (US)", "Los Angeles, CA (US)",
  "San Francisco, CA (US)", "Chicago, IL (US)", "Houston, TX (US)",
  "Seattle, WA (US)", "Boston, MA (US)", "Austin, TX (US)", "Denver, CO (US)",
  "Atlanta, GA (US)", "Miami, FL (US)", "Dallas, TX (US)", "Phoenix, AZ (US)",
  "Philadelphia, PA (US)", "San Diego, CA (US)", "San Jose, CA (US)",
  "Portland, OR (US)", "Nashville, TN (US)", "Charlotte, NC (US)",
  "Detroit, MI (US)", "Minneapolis, MN (US)", "Cupertino, CA (US)",
  "Menlo Park, CA (US)",
  // United States - states. Kept ahead of the smaller cities below so a
  // one-letter query surfaces "Wisconsin" before "Winston-Salem".
  "Washington, US", "Wisconsin, US", "West Virginia, US", "Wyoming, US",
  "California, US", "Texas, US", "Florida, US", "New York, US", "Illinois, US",
  "Massachusetts, US", "Colorado, US", "Georgia, US", "Oregon, US",
  // United States - smaller cities
  "West Valley City, UT (US)", "Winston-Salem, NC (US)", "Wichita, KS (US)",
  "Worcester, MA (US)",
  // United Kingdom + Ireland
  "London, UK", "Manchester, UK", "Birmingham, UK", "Edinburgh, UK",
  "Glasgow, UK", "Bristol, UK", "Leeds, UK", "Cardiff, Wales (UK)",
  "Belfast, Northern Ireland (UK)", "Dublin, Ireland", "Cork, Ireland",
  // Canada
  "Toronto, ON (Canada)", "Vancouver, BC (Canada)", "Montreal, QC (Canada)",
  "Calgary, AB (Canada)", "Ottawa, ON (Canada)", "Waterloo, ON (Canada)",
  // Europe
  "Berlin, Germany", "Munich, Germany", "Hamburg, Germany", "Paris, France",
  "Lyon, France", "Amsterdam, Netherlands", "Rotterdam, Netherlands",
  "Madrid, Spain", "Barcelona, Spain", "Rome, Italy", "Milan, Italy",
  "Lisbon, Portugal", "Warsaw, Poland", "Prague, Czechia", "Vienna, Austria",
  "Zurich, Switzerland", "Stockholm, Sweden", "Copenhagen, Denmark",
  "Oslo, Norway", "Helsinki, Finland", "Brussels, Belgium",
  // Asia-Pacific
  "Singapore", "Tokyo, Japan", "Osaka, Japan", "Seoul, South Korea",
  "Hong Kong", "Sydney, NSW (Australia)", "Melbourne, VIC (Australia)",
  "Brisbane, QLD (Australia)", "Perth, WA (Australia)",
  "Auckland, New Zealand", "Wellington, New Zealand",
  // India
  "Bangalore, India", "Mumbai, India", "Delhi, India", "Hyderabad, India",
  "Chennai, India", "Pune, India", "Kolkata, India",
  // Middle East + Africa
  "Dubai, UAE", "Abu Dhabi, UAE", "Tel Aviv, Israel", "Sanaa, Yemen",
  "Cape Town, South Africa", "Johannesburg, South Africa", "Nairobi, Kenya",
  "Lagos, Nigeria",
  // Latin America. Written with their real diacritics - the autocomplete
  // matches accent-insensitively, so typing "leon" still finds "Leon".
  "Sao Paulo, Brazil", "Mexico City, Mexico", "Buenos Aires, Argentina",
  "Bogota, Colombia", "Santiago, Chile", "Santo Domingo, Dominican Republic",
  "Leon de los Aldama, Mexico", "Santiago de los Caballeros, Dominican Republic",
  "Santo Domingo de los Colorados, Ecuador", "San Nicolas de los Garza, Mexico",
  "Santa Cruz de la Sierra, Bolivia", "Santiago de Queretaro, Mexico",
  "Lima, Peru", "Quito, Ecuador", "Montevideo, Uruguay", "Guadalajara, Mexico",
];

export const INSTITUTIONS = [
  "Harvard University", "Stanford University", "Massachusetts Institute of Technology",
  "Southern New Hampshire University", "University of Hawaii At Manoa",
  "University of New Hampshire-Main Campus", "Harrisburg Area Community College",
  "Yale University", "Princeton University", "Columbia University", "Cornell University",
  "University of California, Berkeley", "University of California, Los Angeles",
  "University of Michigan", "New York University", "Boston University", "Northwestern University",
  "University of Texas at Austin", "University of Washington", "Georgia Institute of Technology",
  "University of Oxford", "University of Cambridge", "Imperial College London",
  "University of Toronto", "University of Melbourne", "National University of Singapore",
];
