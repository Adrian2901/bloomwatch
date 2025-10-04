'use client';

import { useState } from 'react';
import Tag from './Tag';

export interface SuperbloomEventData {
  id: number;
  title: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  shortDescription: string;
  fullDescription: string;
  tags: string[];
  season: string;
  peakTime: string;
  isActive: boolean;
}

interface SuperbloomEventProps {
  event: SuperbloomEventData;
  onFocus?: (event: SuperbloomEventData) => void;
  isSelected?: boolean;
}

export default function SuperbloomEvent({ event, onFocus, isSelected = false }: SuperbloomEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (onFocus) {
      onFocus(event);
    }
  };

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg 
        transition-all duration-300 cursor-pointer border-2
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-200'}
        ${isExpanded ? 'pb-4' : ''}
      `}
      onClick={handleClick}
    >
      <div className="p-4">
        {/* Header with title and status indicator */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {event.location}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className={`w-3 h-3 rounded-full ${event.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {event.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {event.tags.map((tag, index) => (
            <Tag key={index} text={tag} />
          ))}
        </div>

        {/* Short description - always visible */}
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
          {event.shortDescription}
        </p>

        {/* Peak time info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium">Peak Time:</span> {event.peakTime} • {event.season}
        </div>

        {/* Expansion indicator */}
        <div className="flex justify-center">
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      <div className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="px-4 pb-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Detailed Description
          </h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {event.fullDescription}
          </p>
          
          {/* Coordinates for debugging/development */}
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Coordinates: {event.coordinates.lat}, {event.coordinates.lng}
          </div>
        </div>
      </div>
    </div>
  );
}