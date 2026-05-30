import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  robots?: string;
  type?: "website" | "profile" | "article";
  image?: string;
  schema?: Record<string, any> | Record<string, any>[];
}

export function SEO({
  title,
  description,
  robots = "index, follow",
  type = "website",
  image,
  schema,
}: SEOProps) {
  useEffect(() => {
    // 1. Update document title
    document.title = title;

    // Helper to update/create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      let tag = document.querySelector(
        `meta[${isProperty ? "property" : "name"}="${name}"]`
      ) as HTMLMetaElement | null;
      
      if (!tag) {
        tag = document.createElement("meta");
        if (isProperty) {
          tag.setAttribute("property", name);
        } else {
          tag.setAttribute("name", name);
        }
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    // 2. Set description & robots
    updateMeta("description", description);
    updateMeta("robots", robots);

    // 3. Set OpenGraph tags
    const origin = typeof window !== "undefined" ? window.location.origin : "https://middelmen.com";
    const canonicalUrl = typeof window !== "undefined" ? `${origin}${window.location.pathname}` : "https://middelmen.com";
    const ogImage = image || `${origin}/opengraph.jpg`;

    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", type, true);
    updateMeta("og:url", canonicalUrl, true);
    updateMeta("og:image", ogImage, true);

    // 4. Set Twitter tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", ogImage);

    // 5. Update/create canonical link
    let canonical = document.querySelector(
      "link[rel=canonical]"
    ) as HTMLLinkElement | null;
    
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // 6. Inject Schema.org JSON-LD structured data
    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-seo="dynamic"]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    if (schema) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo", "dynamic");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    // Clean up dynamic schema script on unmount
    return () => {
      const scriptToRemove = document.querySelector(
        'script[type="application/ld+json"][data-seo="dynamic"]'
      );
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [title, description, robots, type, image, schema]);

  return null;
}
