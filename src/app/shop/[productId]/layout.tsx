import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  const id = parseInt(productId, 10);
  if (isNaN(id)) return { title: "Produs negăsit | PREV-COR TPM" };

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { title: "Produs negăsit | PREV-COR TPM" };

  const title = `${product.name} | PREV-COR TPM`;
  const description = product.description?.slice(0, 160) || product.name;

  return {
    title,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.image ? [{ url: product.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
