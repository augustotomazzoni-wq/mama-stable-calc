import logo from "@/assets/logo-hoffmann-tomazzoni.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-6",
  md: "h-10",
  lg: "h-14",
};

const Logo = ({ className, size = "md" }: LogoProps) => (
  <img
    src={logo}
    alt="Hoffmann & Tomazzoni Advogados"
    className={cn(sizeMap[size], "w-auto object-contain", className)}
  />
);

export default Logo;
