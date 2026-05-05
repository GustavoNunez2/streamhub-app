import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  embedUrl: string;
  title?: string;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  embedUrl,
  title
}) => {
  const isLiveStream = embedUrl.includes('.m3u8') || embedUrl.includes('.ts');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls;

    if (isLiveStream && videoRef.current) {
      // Comprobamos si el motor HLS es compatible
      if (Hls.isSupported()) {
        hls = new Hls({
          // Pequeñas optimizaciones para canales inestables
          maxMaxBufferLength: 30,
          enableWorker: true
        });
        
        hls.loadSource(embedUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Reproducir automáticamente cuando el canal cargue
          videoRef.current?.play().catch((e) => console.log("Esperando interacción del usuario", e));
        });
      } 
      // Soporte de respaldo por si acaso
      else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = embedUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play().catch((e) => console.log("Esperando interacción del usuario", e));
        });
      }
    }

    // Limpieza de memoria vital: destruimos el reproductor anterior al cambiar de canal
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [embedUrl, isLiveStream]);

  return (
    <div className="w-full h-full bg-black relative flex flex-col">
      <div className="flex-1 w-full h-full">
        {isLiveStream ? (
          <video
            ref={videoRef}
            controls
            className="w-full h-full outline-none bg-black"
            poster="https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop"
          />
        ) : (
          <iframe
            src={embedUrl}
            title={title || "Video Player"}
            className="w-full h-full border-none"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="origin"
          ></iframe>
        )}
      </div>
    </div>
  );
};