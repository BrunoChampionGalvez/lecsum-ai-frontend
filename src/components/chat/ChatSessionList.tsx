import React from 'react';
import Link from 'next/link';
import { ChatSession } from '../../lib/api/chat.service';
import { Button } from '../ui/Button';

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeChatId?: string;
  onCreateNewChat: () => void;
}

export const ChatSessionList: React.FC<ChatSessionListProps> = ({
  sessions,
  activeChatId,
  onCreateNewChat,
}) => {
  // Format date to show how long ago the chat was updated
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Button
          onClick={onCreateNewChat}
          className="w-full"
        >
          New Chat
        </Button>
      </div>
      
      <div className="space-y-1">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No chat sessions yet. Start a new chat!
          </p>
        ) : (
          sessions.map((session) => (
            <Link 
              key={session.id} 
              href={`/chat/${session.id}`}
              className={`block p-3 rounded-md text-sm transition-colors ${
                session.id === activeChatId
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="font-medium truncate">{session.name}</div>
              <div className="text-xs mt-1 opacity-80">
                {formatDate(session.updatedAt)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
