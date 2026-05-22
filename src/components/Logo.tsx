import logo from "@/assets/logo-hoffmann-tomazzoni.svg";
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
    src={logo}
    alt="Hoffmann & Tomazzoni Advogados"
    className={cn(sizeMap[size], "w-auto object-contain", className)}
  />
);

export default Logo;
