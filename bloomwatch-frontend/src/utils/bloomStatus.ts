// Utility function to check if a superbloom event is currently active
export function isBloomActive(peakTimeInterval: [string, string]): boolean {
  const now = new Date();
  const [startDate, endDate] = peakTimeInterval;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return now >= start && now <= end;
}

// Utility function to get the status text for a bloom
export function getBloomStatus(peakTimeInterval: [string, string]): {
  isActive: boolean;
  status: 'active' | 'upcoming' | 'past';
  daysUntil?: number;
  daysSince?: number;
} {
  const now = new Date();
  const [startDate, endDate] = peakTimeInterval;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now >= start && now <= end) {
    return { isActive: true, status: 'active' };
  } else if (now < start) {
    const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { isActive: false, status: 'upcoming', daysUntil };
  } else {
    const daysSince = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    return { isActive: false, status: 'past', daysSince };
  }
}