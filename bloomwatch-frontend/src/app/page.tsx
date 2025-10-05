"use client";

import { useState } from "react";
import EventsList from "../components/EventsList";
import ImageView from "../components/Gallery";
import { SuperbloomEventData } from "../components/SuperbloomEvent";

export default function Home() {
  const [selectedEvent, setSelectedEvent] =
    useState<SuperbloomEventData | null>(null);

  const handleEventFocus = (event: SuperbloomEventData) => {
    setSelectedEvent(event);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[var(--primary-subtle)] to-[var(--primary-lightest)] dark:from-gray-900 dark:via-[var(--primary-subtle)] dark:to-gray-800">
      <header className="bg-gradient-to-r from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] shadow-lg border-b-2 border-[var(--accent)] dark:border-[var(--accent)]">
        <div className="px-4 lg:px-6 py-6">
          <div className="flex flex-col items-left justify-center text-left">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                BLOOMWATCH
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
        <div className="w-full lg:w-[30%] lg:min-w-[350px] border-b lg:border-b-0 lg:border-r-2 border-[var(--primary-light)] dark:border-[var(--primary-light)] h-1/2 lg:h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg">
          <EventsList
            onEventFocus={handleEventFocus}
            selectedEventId={selectedEvent?.id || null}
          />
        </div>

        <div className="flex-1 p-4 lg:p-6 h-1/2 lg:h-full">
          <div className="h-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-[var(--primary-light)] dark:border-[var(--primary-light)] p-4">
            <ImageView selectedEvent={selectedEvent} />
          </div>
        </div>
      </main>
    </div>
  );
}
