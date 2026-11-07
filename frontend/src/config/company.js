// Business details shown on the site. Replace every [bracketed placeholder] with genuine information before going live.
const U = "https://images.unsplash.com/photo-";

export const COMPANY = {
  name: "UrbanNest Properties",
  product: "PropMitra",
  city: "Hyderabad",
  phoneDisplay: "+91 90000 00000",
  phoneHref: "+919000000000",
  whatsapp: "919000000000",
  email: "hello@urbannest.in",
  address: "[Office address — to be added], Hyderabad, Telangana",
  hours: "Mon – Sat, 10:00 AM – 7:00 PM",
  rera: "[RERA agent registration no. — to be added]",
  registration: "[Company registration no. — to be added]",
  placeholderNote: "Contact details, registration numbers, team profiles and testimonials are placeholders until UrbanNest provides genuine information.",
};

export const TEAM = [
  { name: "[Advisor name]", role: "Principal Advisor · Buy & Sell", img: `${U}1560250097-0b93528c311a?w=600&q=70&fit=crop` },
  { name: "[Advisor name]", role: "Rentals & Relocation Advisor", img: `${U}1573497019940-1c28c88b4f3e?w=600&q=70&fit=crop` },
  { name: "[Advisor name]", role: "Villas & Premium Homes Advisor", img: `${U}1647580427155-0483906cb9de?w=600&q=70&fit=crop` },
];

export const TESTIMONIALS = [
  { name: "Demo client", role: "Buyer · Kondapur", text: "The assistant asked exactly the right questions and an advisor called the same evening." },
  { name: "Demo client", role: "Tenant · Financial District", text: "I relocated from Pune and needed a rental fast. They shortlisted options within my budget." },
  { name: "Demo client", role: "Villa buyer · Tellapur", text: "Clear information, no pressure and genuinely helpful follow-up." },
];

export const AGENT = { name: "UrbanNest advisory desk", role: "Your UrbanNest property advisor", img: TEAM[0].img };
