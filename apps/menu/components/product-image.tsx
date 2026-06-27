import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

interface Props {
  src?: string | null;
  alt: string;
  /** Classes de tamanho/raio do contêiner (ex.: "w-full h-24 rounded-lg") */
  className?: string;
  sizes?: string;
}

/**
 * Imagem de produto com next/image (lazy-load + otimização) e placeholder
 * da marca quando não houver foto — mantém o grid uniforme e evita layout shift.
 */
export function ProductImage({ src, alt, className = "", sizes = "200px" }: Props) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-creme ${className}`} aria-hidden="true">
        <UtensilsCrossed className="h-7 w-7 text-paprica/30" />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-creme ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
