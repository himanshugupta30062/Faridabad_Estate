import { useEffect } from "react";

export const Seo = ({ title, description, jsonLd }) => {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
    }
    m.content = description || "";
  }, [title, description]);
  return jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null;
};
