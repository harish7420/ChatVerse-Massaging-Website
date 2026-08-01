import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const ImageLightbox = ({ imageUrl, fileName, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in select-none">
      {/* Overlay Background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Control Bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName || 'attachment'}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          title="Download Image"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image View */}
      <div className="relative z-10 max-w-5xl max-h-[85vh] p-2 flex flex-col items-center">
        <img
          src={imageUrl}
          alt={fileName || 'Enlarged Attachment'}
          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
        />
        {fileName && (
          <p className="mt-3 text-sm text-gray-300 font-medium bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
            {fileName}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
