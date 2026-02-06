import Image from "next/image";

interface LoadingOverlayProps {
  message?: string;
  isLoading?: boolean;
}

export default function LoadingOverlay({ 
  message = "Verifying authentication...", 
  isLoading = true 
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center justify-center items-center">
        <div className="mb-4 flex items-center justify-center">
          <Image 
            src="/battlecode_logo_2.png" 
            alt="Loading..." 
            className="flex h-50 w-fit animate-pulse" 
            width={200} 
            height={50} 
          />
        </div>
        <p className="text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
}
