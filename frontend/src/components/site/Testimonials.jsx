import { Quote } from "lucide-react";

const U = "https://images.unsplash.com/";
const T = [
  { name: "Sravani R.", role: "Bought a 3 BHK in Kondapur", img: `${U}photo-1573497019940-1c28c88b4f3e?w=200&q=70&fit=crop`,
    text: "The chat assistant asked exactly the right questions and the UrbanNest advisor called the same evening. Very smooth experience." },
  { name: "Karthik M.", role: "Rented in Financial District", img: `${U}photo-1560250097-0b93528c311a?w=200&q=70&fit=crop`,
    text: "I relocated from Pune and needed a rental fast. They shortlisted options within my budget without wasting my time." },
  { name: "Ananya & Rohit", role: "Villa buyers, Tellapur", img: `${U}photo-1647580427155-0483906cb9de?w=200&q=70&fit=crop`,
    text: "Transparent, patient and genuinely helpful. No pressure — just clear information and good follow-up." },
];

export const Testimonials = () => (
  <section id="testimonials" className="py-20 sm:py-28 bg-[#0F0F12]" data-testid="testimonials-section">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
      <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37]">Client stories</p>
      <h2 className="font-serif text-3xl sm:text-4xl text-white mt-3">Trusted by Hyderabad home seekers</h2>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {T.map((t, i) => (
          <figure key={t.name} className={`bg-[#1A1A22] border border-white/10 rounded-md p-6 sm:p-8 ${i === 1 ? "md:-translate-y-6" : ""}`}>
            <Quote className="w-7 h-7 text-[#D4AF37]" />
            <blockquote className="text-zinc-300 mt-4 leading-relaxed">“{t.text}”</blockquote>
            <figcaption className="flex items-center gap-3 mt-6">
              <img src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
              <div>
                <p className="text-white text-sm font-medium">{t.name}</p>
                <p className="text-zinc-500 text-xs">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);
