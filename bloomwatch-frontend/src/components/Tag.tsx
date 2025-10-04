interface TagProps {
  text: string;
  className?: string;
}

const tagColors: Record<string, string> = {
  'Superbloom': 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg',
  'Yearly': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm',
  'Rare': 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md',
  'Desert': 'bg-gradient-to-r from-yellow-600 to-orange-500 text-white',
  'Valley': 'bg-gradient-to-r from-lime-500 to-green-500 text-white',
  'Alpine': 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
  'UNESCO': 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md',
  'Grassland': 'bg-gradient-to-r from-green-600 to-lime-600 text-white',
  'Semi-arid': 'bg-gradient-to-r from-orange-600 to-red-600 text-white',
  'Cultivated': 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
  'Coastal': 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
  'Prairie': 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white',
  'Hill Country': 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
};

export default function Tag({ text, className = '' }: TagProps) {
  const colorClass = tagColors[text] || 'bg-gray-500 text-white';
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${colorClass} ${className}`}
    >
      {text}
    </span>
  );
}