import Image from "next/image";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

const SIZE_PX = { xs: 24, sm: 32, md: 40, lg: 64 } as const;

export default function Avatar({ src, name, size = "md" }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const px = SIZE_PX[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-indigo-900 font-bold text-white`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
