"use client";

import { useState, useEffect } from "react";
import SuperbloomEvent, { SuperbloomEventData } from "./SuperbloomEvent";
import superbloomData from "../data/superbloom-events.json";
import { getBloomStatus } from "../utils/bloomStatus";

interface EventsListProps {
  onEventFocus?: (event: SuperbloomEventData) => void;
  selectedEventId?: number | null;
}

export default function EventsList({
  onEventFocus,
  selectedEventId,
}: EventsListProps) {
  const [events, setEvents] = useState<SuperbloomEventData[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "soon" | "inactive">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Load events data (in a real app, this might be from an API)
    setEvents(superbloomData as SuperbloomEventData[]);
  }, []);

  const filteredEvents = events.filter((event) => {
    const bloomStatus = getBloomStatus(event.peakTimeInterval);
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && bloomStatus.status === "active") ||
      (filter === "soon" &&
        bloomStatus.status === "upcoming" &&
        bloomStatus.daysUntil &&
        bloomStatus.daysUntil <= 50) ||
      (filter === "inactive" &&
        (bloomStatus.status === "past" ||
          (bloomStatus.status === "upcoming" &&
            bloomStatus.daysUntil &&
            bloomStatus.daysUntil > 50)));

    const matchesSearch =
      searchTerm === "" ||
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesFilter && matchesSearch;
  });

  const handleEventFocus = (event: SuperbloomEventData) => {
    if (onEventFocus) {
      onEventFocus(event);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[var(--primary-subtle)] to-white dark:from-[var(--primary-subtle)] dark:to-gray-900">
      {/* Header COLOR */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[var(--primary-lightest)] to-white dark:from-[var(--primary-lightest)] dark:to-gray-900 border-b-2 border-[var(--primary-light)] dark:border-[var(--primary-light)] p-4 backdrop-blur-sm">
        <h2 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent mb-4">
          Superbloom Events
        </h2>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--primary)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search events, locations, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-[var(--primary-light)] dark:border-[var(--primary-light)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] dark:bg-gray-700 dark:text-white text-sm bg-white/90 shadow-sm"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {[
            { key: "all" as const, label: "All Events" },
            { key: "active" as const, label: "Active" },
            { key: "soon" as const, label: "Soon" },
            { key: "inactive" as const, label: "Inactive" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 shadow-sm ${
                filter === key
                  ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-md transform scale-105"
                  : "bg-white dark:bg-gray-700 text-[var(--primary)] dark:text-gray-300 hover:bg-[var(--primary-lightest)] dark:hover:bg-gray-600 border border-[var(--primary-light)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm text-[var(--primary)] dark:text-[var(--accent)] mt-2 font-medium">
          {filteredEvents.length} event
          {filteredEvents.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <SuperbloomEvent
                key={event.id}
                event={event}
                onFocus={handleEventFocus}
                isSelected={selectedEventId === event.id}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto w-12 h-12 text-gray-400 mb-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
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
