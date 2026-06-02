import Image from "next/image";

export const perchWordmarkHref = "/brand/perch-wordmark-primary.svg";

type BrandWordmarkProps = {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function BrandWordmark({
  className,
  width = 118,
  height = 52,
  priority = false,
}: BrandWordmarkProps) {
  return (
    <Image
      className={className}
      src={perchWordmarkHref}
      alt="Perch"
      width={width}
      height={height}
      priority={priority}
    />
  );
}
