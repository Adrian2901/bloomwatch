'use client';

import { useState } from 'react';
import EventsList from '../components/EventsList';
import ImageView from '../components/Gallery';
import { SuperbloomEventData } from '../components/SuperbloomEvent';

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<SuperbloomEventData | null>(null);

  const handleEventFocus = (event: SuperbloomEventData) => {
    setSelectedEvent(event);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white" style={{fontFamily: 'Pacifico, cursive'}}>
              BloomWatch
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track and explore superbloom events across the globe
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        <div className="w-full lg:w-[30%] lg:min-w-[350px] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 h-1/2 lg:h-full">
          <EventsList 
            onEventFocus={handleEventFocus}
            selectedEventId={selectedEvent?.id || null}
          />
        </div>

        <div className="flex-1 p-2 lg:p-4 h-1/2 lg:h-full">
          <ImageView 
            selectedEvent={selectedEvent}
          />
        </div>
      </main>
    </div>
  );
}
