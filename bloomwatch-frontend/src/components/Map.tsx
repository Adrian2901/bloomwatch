'use client';

import { SuperbloomEventData } from './SuperbloomEvent';

interface MapProps {
  selectedEvent?: SuperbloomEventData | null;
  onEventSelect?: (event: SuperbloomEventData | null) => void;
}

export default function Map({ selectedEvent }: MapProps) {
  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
      {/* Map Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Interactive Map
        </h2>
        {selectedEvent && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Focused on: {selectedEvent.title}
          </p>
        )}
      </div>

      {/* Map Placeholder */}
      <div className="flex-1 relative bg-gradient-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-600 rounded-b-lg overflow-hidden">
        {/* Grid pattern to simulate map */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 h-full">
            {Array.from({ length: 144 }, (_, i) => (
              <div key={i} className="border border-gray-300 dark:border-gray-500" />
            ))}
          </div>
        </div>

        {/* Map content */}
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Map Module
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-sm">
              Interactive map will be implemented here. It will show superbloom locations and zoom to selected events.
            </p>

            {selectedEvent && (
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md max-w-sm mx-auto">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Selected Event
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  <strong>{selectedEvent.title}</strong>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {selectedEvent.location}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Coordinates: {selectedEvent.coordinates.lat}, {selectedEvent.coordinates.lng}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mock location pins */}
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        <div className="absolute bottom-1/4 right-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />

        {/* Map controls placeholder */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white dark:bg-gray-700 rounded shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white dark:bg-gray-700 rounded shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}