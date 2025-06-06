"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { MentionedMaterial } from '../../lib/api/chat.service';

interface ChatInputFormProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  onInputChange?: (message: string) => void;
  selectedMaterials?: MentionedMaterial[];
  message?: string; // Add controlled message prop
  setMessage?: (message: string) => void; // Add setter for two-way binding
  liteMode?: boolean;
  thinkMode?: boolean;
  liteDisabled?: boolean;
  thinkDisabled?: boolean;
  lastChangeWasExternal?: boolean; // Flag to indicate if the change was from Ask Lecsi buttons
}

export const ChatInputForm: React.FC<ChatInputFormProps> = ({
  onSendMessage,
  isLoading,
  onInputChange,
  selectedMaterials = [],
  message: controlledMessage,
  setMessage: setControlledMessage,
  liteMode = false,
  thinkMode = false,
  liteDisabled = false,
  thinkDisabled = false,
  lastChangeWasExternal = false,
}) => {
  // Use internal state if not controlled externally
  const [internalMessage, setInternalMessage] = useState('');
  const message = controlledMessage !== undefined ? controlledMessage : internalMessage;
  const setMessage = setControlledMessage || setInternalMessage;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows (without automatic scrolling)
  useEffect(() => {
    if (textareaRef.current) {
      // Auto-resize the textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  // Handle scrolling behavior when content changes
  useEffect(() => {
    // Only scroll to bottom if the change was external (from Ask Lecsi buttons)
    if (lastChangeWasExternal && textareaRef.current) {
      // Focus the textarea
      textareaRef.current.focus();
      
      // Scroll to the bottom with a slight delay to ensure content is rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [lastChangeWasExternal, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require a message if there are no selected materials
    // This allows sending a message with only references and no text
    if ((message.trim() === '' && selectedMaterials.length === 0) || isLoading) return;
    
    try {
      // Just use the original message without adding the materials
      // The materials are already handled separately via their IDs in the parent component
      // This ensures they only appear as chips/tags and not in the message text
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-2">
      <div className="flex items-end">
        {liteMode && (
          <>
          <textarea
          ref={textareaRef}
          className="flex-grow resize-none border-0 focus:outline-none focus:ring-0 p-2 max-h-32"
          placeholder="@ to add context to Lecsi..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (onInputChange) onInputChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading || liteDisabled}
        />
        <Button
          type="submit"
          disabled={liteDisabled || (message.trim() === '' && selectedMaterials.length === 0) || isLoading}
          isLoading={isLoading}
          className="ml-2"
        >
          Send
        </Button>
        </>
        )}
        {thinkMode && (
          <>
          <textarea
          ref={textareaRef}
          className="flex-grow resize-none border-0 focus:outline-none focus:ring-0 p-2 max-h-32"
          value={message}
          placeholder="@ to add context to Lecsi..."
          onChange={(e) => {
            setMessage(e.target.value);
            if (onInputChange) onInputChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading || thinkDisabled}
        />
        <Button
          type="submit"
          disabled={thinkDisabled || (message.trim() === '' && selectedMaterials.length === 0) || isLoading}
          isLoading={isLoading}
          className="ml-2"
        >
          Send
        </Button>
        </>
        )}
      </div>
    </form>
  );
};
