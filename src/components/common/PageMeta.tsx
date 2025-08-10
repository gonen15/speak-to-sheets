import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description?: string;
  path?: string;
}

const PageMeta = ({ title, description = "", path = "/" }: PageMetaProps) => {
  const canonical = typeof window !== "undefined" ? window.location.origin + path : path;
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
};

export default PageMeta;
