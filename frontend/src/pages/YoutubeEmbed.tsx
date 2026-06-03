import React from "react";
import { useParams } from "react-router-dom";

export const YoutubeEmbed: React.FC = () => {
  const { youtubeId } = useParams<{ youtubeId: string }>();

  if (!youtubeId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white text-sm">
        No video ID provided
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center relative">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0&enablejsapi=1`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full border-0 absolute inset-0"
      />
    </div>
  );
};

export default YoutubeEmbed;
