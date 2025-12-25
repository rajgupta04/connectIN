import React from 'react';
import Modal from '../layout/Modal';

const IncomingCallModal = ({
  isOpen,
  callerName,
  callerAvatarUrl,
  callType,
  onAccept,
  onReject
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onReject} title="Incoming call">
      <div className="flex items-center gap-3">
        <img
          src={callerAvatarUrl || 'https://via.placeholder.com/48'}
          alt=""
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white truncate">
            {callerName || 'A connection'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {callType === 'audio' ? 'Audio call' : 'Video call'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onReject}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          Accept
        </button>
      </div>
    </Modal>
  );
};

export default IncomingCallModal;
