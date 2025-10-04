'use client';

import { useState, useRef, useEffect } from 'react';
import { SuperbloomEventData } from './SuperbloomEvent';
import Image from 'next/image';

type ViewMode = 'satellite' | 'gallery' | 'graph';

interface ImageViewProps {
  selectedEvent?: SuperbloomEventData | null;
}

export default function ImageView({ selectedEvent }: ImageViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('satellite');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentSatelliteIndex, setCurrentSatelliteIndex] = useState(0);
  const [currentGraphIndex, setCurrentGraphIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset image index when event changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setCurrentSatelliteIndex(0);
    setCurrentGraphIndex(0);
    setViewMode('satellite'); // Default to satellite view
    setIsZoomed(false);
    setImageLoaded(false);
  }, [selectedEvent?.id]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const hasImages = viewMode === 'gallery' ? selectedEvent?.images?.length : 
                     viewMode === 'satellite' ? selectedEvent?.satelliteImages?.length :
                     selectedEvent?.graphImages?.length;
    if (!hasImages) return;
    
    if (!isZoomed) {
      // Calculate click position as percentage
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
      setIsZoomed(true);
    } else {
      setIsZoomed(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const goToImage = (index: number) => {
    if (viewMode === 'gallery') {
      setCurrentImageIndex(index);
    } else if (viewMode === 'satellite') {
      setCurrentSatelliteIndex(index);
    } else {
      setCurrentGraphIndex(index);
    }
    setIsZoomed(false);
    setImageLoaded(false);
  };

  const goToPrevious = () => {
    if (viewMode === 'gallery') {
      if (!selectedEvent?.images?.length) return;
      const newIndex = currentImageIndex === 0 ? selectedEvent.images.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
    } else if (viewMode === 'satellite') {
      if (!selectedEvent?.satelliteImages?.length) return;
      const newIndex = currentSatelliteIndex === 0 ? selectedEvent.satelliteImages.length - 1 : currentSatelliteIndex - 1;
      setCurrentSatelliteIndex(newIndex);
    } else {
      if (!selectedEvent?.graphImages?.length) return;
      const newIndex = currentGraphIndex === 0 ? selectedEvent.graphImages.length - 1 : currentGraphIndex - 1;
      setCurrentGraphIndex(newIndex);
    }
    setIsZoomed(false);
    setImageLoaded(false);
  };

  const goToNext = () => {
    if (viewMode === 'gallery') {
      if (!selectedEvent?.images?.length) return;
      const newIndex = currentImageIndex === selectedEvent.images.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
    } else if (viewMode === 'satellite') {
      if (!selectedEvent?.satelliteImages?.length) return;
      const newIndex = currentSatelliteIndex === selectedEvent.satelliteImages.length - 1 ? 0 : currentSatelliteIndex + 1;
      setCurrentSatelliteIndex(newIndex);
    } else {
      if (!selectedEvent?.graphImages?.length) return;
      const newIndex = currentGraphIndex === selectedEvent.graphImages.length - 1 ? 0 : currentGraphIndex + 1;
      setCurrentGraphIndex(newIndex);
    }
    setIsZoomed(false);
    setImageLoaded(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setIsZoomed(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, currentSatelliteIndex, currentGraphIndex, selectedEvent, viewMode]);

  if (!selectedEvent) {
    return (
      <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Image View
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select a superbloom event to view satellite imagery and photos
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-b-lg">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Event Selected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Choose a superbloom event from the list to view satellite imagery and photos
            </p>
          </div>
        </div>
      </div>
    );
  }

  const images = selectedEvent.images || [];
  const satelliteImages = selectedEvent.satelliteImages || [];
  const graphImages = selectedEvent.graphImages || [];
  
  const currentData = viewMode === 'gallery' ? images : 
                     viewMode === 'satellite' ? satelliteImages :
                     graphImages;
  const currentIndex = viewMode === 'gallery' ? currentImageIndex : 
                      viewMode === 'satellite' ? currentSatelliteIndex :
                      currentGraphIndex;
  const currentImage = viewMode === 'gallery' ? images[currentImageIndex] : 
                      viewMode === 'satellite' ? satelliteImages[currentSatelliteIndex]?.image :
                      graphImages[currentGraphIndex]?.image;

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('satellite')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'satellite'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'gallery'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🖼️ Gallery
          </button>
          {graphImages.length > 0 && (
            <button
              onClick={() => setViewMode('graph')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📊 Graph
            </button>
          )}
        </div>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 relative overflow-hidden">
        {currentData.length > 0 && currentImage ? (
          <>
            {/* Image Container */}
            <div
              ref={containerRef}
              className={`relative w-full h-full bg-gray-100 dark:bg-gray-800 cursor-${isZoomed ? 'zoom-out' : 'zoom-in'} overflow-hidden`}
              onClick={handleImageClick}
              onMouseMove={handleMouseMove}
            >
              <div
                className={`relative w-full h-full transition-transform duration-300 ease-out ${
                  isZoomed ? 'scale-200' : 'scale-100'
                }`}
                style={
                  isZoomed
                    ? {
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      }
                    : {}
                }
              >
                <Image
                  ref={imageRef}
                  src={currentImage}
                  alt={`${selectedEvent.title} - ${
                    viewMode === 'satellite' ? `Satellite ${satelliteImages[currentSatelliteIndex]?.year}` : 
                    viewMode === 'gallery' ? `Image ${currentImageIndex + 1}` :
                    graphImages[currentGraphIndex]?.title || `Graph ${currentGraphIndex + 1}`
                  }`}
                  fill
                  className="object-contain"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    console.error('Failed to load image:', currentImage);
                    setImageLoaded(true);
                  }}
                  unoptimized={Boolean(currentImage && currentImage.startsWith('http'))}
                />
                
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>

              {/* Zoom hint */}
              {!isZoomed && imageLoaded && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  Click to zoom
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {currentData.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                  title="Previous image"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                  title="Next image"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No images available for this event
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      {currentData.length > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {viewMode === 'satellite' ? (
            /* Satellite View - Year Navigation */
            <>
              <div className="flex items-center justify-center gap-3 overflow-x-auto max-w-full">
                {satelliteImages.map((satImage, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                      index === currentSatelliteIndex
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title={`View satellite image from ${satImage.year}`}
                  >
                    {satImage.year}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Use arrow keys or click years to navigate satellite imagery
                </div>
                <div className="flex items-center gap-1">
                  {satelliteImages.map((_: any, index: number) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentSatelliteIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : viewMode === 'gallery' ? (
            /* Gallery View - Image Thumbnails */
            <>
              <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full">
                {images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                    title={`View image ${index + 1}`}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      width={64}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized={image.startsWith('http')}
                      onError={(e) => {
                        console.error('Failed to load thumbnail:', image);
                      }}
                    />
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">  
                  Use arrow keys or click thumbnails to navigate
                </div>
                <div className="flex items-center gap-1">
                  {images.map((_: string, index: number) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Graph View - Graph Thumbnails */
            <>
              <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full">
                {graphImages.map((graphImage, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentGraphIndex
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                    title={graphImage.title || `View graph ${index + 1}`}
                  >
                    <Image
                      src={graphImage.image}
                      alt={`Graph thumbnail ${index + 1}`}
                      width={64}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized={graphImage.image.startsWith('http')}
                      onError={(e) => {
                        console.error('Failed to load graph thumbnail:', graphImage.image);
                      }}
                    />
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">  
                  Use arrow keys or click thumbnails to navigate graphs
                </div>
                <div className="flex items-center gap-1">
                  {graphImages.map((_: any, index: number) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentGraphIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}