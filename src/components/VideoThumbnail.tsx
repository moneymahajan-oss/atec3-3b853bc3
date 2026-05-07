import { useState } from "react";

interface VideoThumbnailProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export default function VideoThumbnail({ src, alt = "", className = "" }: VideoThumbnailProps) {
  const [imgError, setImgError] = useState(false);

  const safeSrc = !imgError && src ? src : "/placeholder.svg";

  return (
    <img
      src={safeSrc}
      onError={() => setImgError(true)}
      alt={alt}
      className={className}
    />
  );
}
