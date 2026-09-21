import logoAsset from "@/assets/logo-hoffmann-tomazzoni-2026.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-[120px]",
  md: "h-[200px]",
  lg: "h-[280px]",
};

const Logo = ({ className, size = "md" }: LogoProps) => (
  <img
    src={logoAsset.url}
    alt="Hoffmann & Tomazzoni Advogados"
    className={cn(sizeMap[size], "w-auto object-contain", className)}
  />
);

export default Logo;
