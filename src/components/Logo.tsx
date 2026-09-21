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

const logoUrl = window.location.hostname === "localhost"
  ? `https://id-preview--006e3153-a560-418e-9f15-b291eafbdab6.lovable.app${logoAsset.url}`
  : logoAsset.url;

const Logo = ({ className, size = "md" }: LogoProps) => (
  <img
    src={logoUrl}
    alt="Hoffmann & Tomazzoni Advocacia"
    className={cn(sizeMap[size], "w-auto object-contain", className)}
  />
);

export default Logo;
