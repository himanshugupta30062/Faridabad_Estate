// Business details shown on the site. Replace every [bracketed placeholder] with genuine information before going live.
const U = "https://images.unsplash.com/photo-";

export const COMPANY = {
  name: "Faridabad Estates",
  product: "Estate Mitra",
  tagline: "Find Your Place. Build Your Future.",
  city: "Faridabad",
  phoneDisplay: "+91 90000 00000",
  phoneHref: "+919000000000",
  // Set REACT_APP_WHATSAPP_NUMBER (country code + number, digits only, e.g. 919812345678) in frontend/.env
  whatsapp: (process.env.REACT_APP_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  email: "hello@urbannest.in",
  address: "Faridabad, Haryana",
  hours: "Mon – Sat, 10:00 AM – 7:00 PM",
  rera: "[RERA agent registration no. — to be added]",
  registration: "[Company registration no. — to be added]",
  placeholderNote: "Contact details, registration numbers, team profiles and testimonials are placeholders until Faridabad Estates provides genuine information.",
};

export const TEAM = [
  { name: "[Advisor name]", role: "Principal Advisor · Buy & Sell", img: `${U}1560250097-0b93528c311a?w=600&q=70&fit=crop` },
  { name: "[Advisor name]", role: "Rentals & Relocation Advisor", img: `${U}1573497019940-1c28c88b4f3e?w=600&q=70&fit=crop` },
  { name: "[Advisor name]", role: "Villas & Premium Homes Advisor", img: `${U}1647580427155-0483906cb9de?w=600&q=70&fit=crop` },
];

export const TESTIMONIALS = [
  { name: "Demo client", role: "Buyer · Sector 15", text: "The assistant asked exactly the right questions and an advisor called the same evening." },
  { name: "Demo client", role: "Tenant · Greater Faridabad", text: "I relocated from Noida and needed a rental fast. They shortlisted options within my budget." },
  { name: "Demo client", role: "House buyer · Sector 21C", text: "Clear information, no pressure and genuinely helpful follow-up." },
];

export const whatsappUrl = (text) =>
  COMPANY.whatsapp ? `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(text)}` : null;

export const AGENT = { name: "Faridabad Estates advisory desk", role: "Your Faridabad Estates property advisor", img: TEAM[0].img };
