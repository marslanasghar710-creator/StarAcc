import type { MetadataRoute } from "next";

const routes = ["", "/product", "/pricing", "/demo", "/security", "/contact", "/faq", "/updates"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://staracc.example${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
