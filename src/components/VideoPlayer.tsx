import React from 'react';

interface VideoPlayerProps {
  embedUrl: string;
  title?: string;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  embedUrl,
  title
}) => {
  return (
    <div className="w-full h-full bg-black relative flex flex-col">
      <div className="flex-1 w-full h-full">
        <iframe
          src={embedUrl}
          title={title || "Video Player"}
          className="w-full h-full border-none"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="origin"
        ></iframe>
      </div>
    </div>
  );
};
