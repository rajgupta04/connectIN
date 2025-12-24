import React from 'react';
import { UserPlus } from 'lucide-react';

const RecommendedConnectionCard = ({ user, onConnect, isRemoving = false }) => {
  const mutuals = Array.isArray(user?.mutualConnections) ? user.mutualConnections : [];

  return (
    <div
      className={
        `border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center text-center relative ` +
        `transition-all duration-200 ` +
        (isRemoving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100')
      }
    >
      <img
        src={user.avatarUrl || 'https://via.placeholder.com/80'}
        alt=""
        className="w-20 h-20 rounded-full object-cover mb-3"
      />

      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{user.name}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 h-8 line-clamp-2">
        {user.headline || 'Member'}
      </p>

      {mutuals.length > 0 && (
        <div className="flex items-center justify-center mb-3">
          {mutuals.slice(0, 3).map((m, idx) => (
            <img
              key={m._id || idx}
              src={m.avatarUrl || 'https://via.placeholder.com/24'}
              alt=""
              className={
                `w-6 h-6 rounded-full object-cover border-2 border-white dark:border-gray-800 ` +
                (idx === 0 ? '' : '-ml-2')
              }
              title=""
            />
          ))}
        </div>
      )}

      <button
        onClick={() => onConnect(user)}
        className="mt-auto flex items-center justify-center space-x-2 px-4 py-1.5 border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-full text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 w-full"
      >
        <UserPlus size={16} />
        <span>Connect</span>
      </button>
    </div>
  );
};

export default RecommendedConnectionCard;
