import { ShieldCheck, Sparkles, Handshake, Building2 } from "lucide-react";

const POINTS = [
  { icon: Sparkles, title: "AI-guided discovery", text: "Property Mitra understands your needs and shortlists only listings that truly match." },
  { icon: ShieldCheck, title: "Honest advice", text: "Clear information from our listings — no inflated promises, no invented details." },
  { icon: Handshake, title: "Advisor follow-up", text: "Every enquiry is reviewed by an UrbanNest consultant who calls you back personally." },
  { icon: Building2, title: "West Hyderabad focus", text: "Gachibowli, Kokapet, Financial District, Tellapur, Narsingi and nearby growth corridors." },
];

export const About = () => (
  <section id="about" className="py-20 sm:py-28 bg-white text-[#0F0F12]" data-testid="about-section">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#8A7322] font-medium">About UrbanNest Properties</p>
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 leading-tight">A Hyderabad consultancy that listens first.</h2>
        <p className="text-zinc-600 mt-6 leading-relaxed">
          UrbanNest Properties helps families and professionals buy, rent and sell homes across Hyderabad. PropMitra, our AI property advisor,
          makes the first conversation effortless — so our consultants can focus on what matters: finding the right home for you.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-white p-6 sm:p-8">
            <Icon className="w-6 h-6 text-[#B89228]" />
            <h3 className="font-serif text-xl mt-4">{title}</h3>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
