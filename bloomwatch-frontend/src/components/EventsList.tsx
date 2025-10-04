'use client';

import { useState, useEffect } from 'react';
import SuperbloomEvent, { SuperbloomEventData } from './SuperbloomEvent';
import superbloomData from '../data/superbloom-events.json';

interface EventsListProps {
  onEventFocus?: (event: SuperbloomEventData) => void;
  selectedEventId?: number | null;
}

export default function EventsList({ onEventFocus, selectedEventId }: EventsListProps) {
  const [events, setEvents] = useState<SuperbloomEventData[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load events data (in a real app, this might be from an API)
    setEvents(superbloomData as SuperbloomEventData[]);
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && event.isActive) || 
      (filter === 'inactive' && !event.isActive);
    
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleEventFocus = (event: SuperbloomEventData) => {
    if (onEventFocus) {
      onEventFocus(event);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Superbloom Events
        </h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search events, locations, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: 'All Events' },
            { key: 'active' as const, label: 'Active' },
            { key: 'inactive' as const, label: 'Inactive' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <SuperbloomEvent
                key={event.id}
                event={event}
                onFocus={handleEventFocus}
                isSelected={selectedEventId === event.id}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto w-12 h-12 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                No events found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}