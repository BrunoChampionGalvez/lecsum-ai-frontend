"use client";

import React, { createContext, useContext, useState } from 'react';
import { MentionedMaterial } from '../api/chat.service';

interface ChatContextProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  addMaterialToChat: (material: MentionedMaterial) => boolean;
  selectedMaterials: MentionedMaterial[];
  setSelectedMaterials: React.Dispatch<React.SetStateAction<MentionedMaterial[]>>;
  createNewSession: boolean;
  setCreateNewSession: React.Dispatch<React.SetStateAction<boolean>>;
  hasActiveSession: boolean;
  setHasActiveSession: React.Dispatch<React.SetStateAction<boolean>>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  // Function to set input value from external sources (e.g., Ask Lecsi buttons)
  setInputValueExternal: (value: string) => void;
  // Flag indicating if the last input change was from an external source
  lastChangeWasExternal: boolean;
}

const ChatContext = createContext<ChatContextProps | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<MentionedMaterial[]>([]);
  const [createNewSession, setCreateNewSession] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastChangeWasExternal, setLastChangeWasExternal] = useState(false);
  
  // Special function to set input value from external sources like Ask Lecsi buttons
  // This function also sets the lastChangeWasExternal flag to true
  const setInputValueExternal = (value: string) => {
    setInputValue(value);
    setLastChangeWasExternal(true);
    
    // Reset the flag after a short delay to handle subsequent manual edits correctly
    setTimeout(() => {
      setLastChangeWasExternal(false);
    }, 100);
  };

  const addMaterialToChat = (material: MentionedMaterial) => {
    // Check if material is already selected to prevent duplicates
    if (!selectedMaterials.some(m => m.id === material.id)) {
      setSelectedMaterials(prev => [...prev, material]);
      
      // Ensure the sidebar is open when adding a material
      setIsSidebarOpen(true);
      return true; // Material was added
    }
    
    // Material was already in the list
    return false;
  };

  return (
    <ChatContext.Provider 
      value={{ 
        isSidebarOpen, 
        setIsSidebarOpen,
        addMaterialToChat,
        selectedMaterials,
        setSelectedMaterials,
        createNewSession,
        setCreateNewSession,
        hasActiveSession,
        setHasActiveSession,
        inputValue,
        setInputValue,
        setInputValueExternal,
        lastChangeWasExternal
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
