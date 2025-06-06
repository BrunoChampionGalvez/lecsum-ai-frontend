"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChatInputForm } from "./ChatInputForm";
import { ChatMessage } from "./ChatMessage";
import { useAuth } from "../../lib/auth/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/api/client";
import { MentionedMaterial, MessageCitation } from "../../lib/api/chat.service";
import { useSubscriptionLimits } from "../../hooks/useSubscriptionLimits";
import { toast } from "react-hot-toast";
import { useChatContext } from "../../lib/chat/ChatContext";

// Using the configured apiClient that automatically handles authentication

// Define interfaces for our data types
interface LecsiMessage {
  id: string;
  content: string;
  role: "user" | "ai";
  createdAt: string;
  citations?: MessageCitation[]; // Changed from unknown[] to use the specific type
  selectedMaterials?: MentionedMaterial[];
}

// Study material types
interface BaseMaterial {
  id: string;
  name: string;
  path?: string[];
}

interface Course extends BaseMaterial {
  type: "course";
  courseId?: string; // Adding courseId to Course interface
}

interface Folder extends BaseMaterial {
  type: "folder";
  parentId: string | null;
  courseId: string;
}

interface File extends BaseMaterial {
  type: "file";
  parentId: string | null;
  courseId: string;
}

interface Quiz extends BaseMaterial {
  type: "quiz";
  courseId: string;
}

interface Deck extends BaseMaterial {
  type: "flashcardDeck";
  courseId: string;
}

type StudyMaterial = Course | Folder | File | Quiz | Deck;

// Now using MentionedMaterial imported from chat.service.ts

// Chat session interface to match the backend structure
interface ChatSession {
  id: string;
  name: string;
  userId: string;
  contextFileIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

import { MessageRole } from "../../lib/api/chat.service";
import { AxiosError } from 'axios'; // Added for error typing

export const LecsiChatSidebar: React.FC = () => {
  const [hover, setHover] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isSidebarOpen: open, 
    setIsSidebarOpen: setOpen,
    selectedMaterials: contextMaterials,
    setSelectedMaterials: setContextMaterials,
    createNewSession,
    setCreateNewSession,
    // hasActiveSession, // Removed as unused
    setHasActiveSession
  } = useChatContext();
  const [messages, setMessages] = useState<LecsiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'lite' | 'think'>('lite');
  
  // Get subscription limits
  const { 
    canUseLiteMessage, 
    canUseThinkMessage, 
    // remaining, // Removed as unused
    isActive
    // refresh: refreshSubscriptionLimits // Removed as unused
  } = useSubscriptionLimits();
  
  // const currentModeIsLimited = chatMode === 'lite' ? !canUseLiteMessage : !canUseThinkMessage; // Removed as unused
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudyMaterial[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<MentionedMaterial[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Get inputValue, setInputValue and lastChangeWasExternal from ChatContext
  const { inputValue, setInputValue, lastChangeWasExternal } = useChatContext();

  // State for chat sessions list
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showSessionsHistory, setShowSessionsHistory] = useState(false);

  // Track whether we're currently loading sessions to prevent duplicate requests
  const isLoadingSessionsRef = useRef(false);

  const createNewChatSession = useCallback(async (initialMaterials?: MentionedMaterial[]) => {
    if (!user) {
      setErrorMessage("User not authenticated. Cannot create a new chat session.");
      return null;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: { name?: string; contextFileIds?: string[] } = {};
      const materialsToUse = initialMaterials || [];

      if (materialsToUse.length > 0) {
        payload.name = `Chat with ${materialsToUse.map(m => m.displayName).join(', ')}`;
        payload.contextFileIds = materialsToUse.map(m => m.id);
      } else {
        payload.name = "New Chat"; // Default name
      }

      const response = await apiClient.post('/chat/sessions', payload);
      const newSession = response as ChatSession;

      setSessionId(newSession.id);
      setMessages([]);
      setChatSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
      setSelectedMaterials(materialsToUse);
      localStorage.setItem('chatSessionId', newSession.id);
      setHasActiveSession(true);
      return newSession.id;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }, message?: string };
      console.error('Failed to create new chat session:', error);
      const apiErrorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setErrorMessage(`Failed to create new chat session: ${apiErrorMessage}`);
      setHasActiveSession(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    user, 
    setSessionId, 
    setMessages, 
    setChatSessions, 
    setErrorMessage, 
    setIsLoading, 
    setSelectedMaterials,
    setHasActiveSession
    // apiClient is stable and not listed as a dependency
  ]);
  // Track when sessions were last loaded to prevent frequent reloads
  const lastSessionLoadTimeRef = useRef(0);

  // Load user's chat sessions with optimization to prevent redundant API calls
  const loadChatSessions = useCallback(async (force = false) => {
    // Skip if already loading
    if (isLoadingSessionsRef.current) {
      console.log('Sessions already loading, skipping redundant request');
      return [];
    }

    // Skip if sessions were loaded recently (less than 10 seconds ago) unless force=true
    const now = Date.now();
    const timeSinceLastLoad = now - lastSessionLoadTimeRef.current;
    if (!force && lastSessionLoadTimeRef.current > 0 && timeSinceLastLoad < 10000) {
      console.log(`Sessions were loaded ${timeSinceLastLoad}ms ago, using cached data`);
      return chatSessions;
    }

    // Set loading flag to prevent parallel requests
    isLoadingSessionsRef.current = true;
    
    try {
      setIsLoadingSessions(true);
      const response = await apiClient.get('/chat/sessions');
      const sessions = response as ChatSession[];
      
      // Sort sessions by creation date (newest first)
      const sortedSessions = sessions && Array.isArray(sessions) ? 
        [...sessions].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Descending order (newest first)
        }) : [];
      
      console.log('Loaded and sorted sessions:', sortedSessions);
      setChatSessions(sortedSessions);
      
      // IMPORTANT: Check if current sessionId exists in the loaded sessions
      // If not, clear it to prevent 404 errors
      const currentSessionId = localStorage.getItem('chatSessionId');
      if (currentSessionId) {
        const sessionExists = sortedSessions.some(session => session.id === currentSessionId);
        if (!sessionExists) {
          console.log(`Session ${currentSessionId} not found in loaded sessions, clearing it`);
          localStorage.removeItem('chatSessionId');
          setSessionId(null);
          setMessages([]);
        }
      }
      
      // Update the timestamp of when we last loaded sessions
      lastSessionLoadTimeRef.current = Date.now();
      
      return sortedSessions;
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setChatSessions([]);
      
      // Clear any session data to prevent 404 errors
      localStorage.removeItem('chatSessionId');
      setSessionId(null);
      setMessages([]);
      
      return [];
    } finally {
      setIsLoadingSessions(false);
      // Clear the loading flag
      isLoadingSessionsRef.current = false;
    }
  }, [chatSessions, setSessionId, setMessages]);

  // Update active session status whenever sessionId changes
  useEffect(() => {
    setHasActiveSession(!!sessionId);
  }, [sessionId, setHasActiveSession]);



  // Always load chat sessions history regardless of active session
  useEffect(() => {
    let isMounted = true;
    
    const loadSessionsHistory = async () => {
      if (!isMounted || !user || authLoading) return;
      
      try {
        console.log('Loading chat session history...');
        await loadChatSessions();
        console.log('Chat session history loaded successfully');
      } catch (error) {
        console.error('Error loading chat session history:', error);
      }
    };
    
    // Load sessions history when sidebar opens or when user changes
    if (open) {
      // Add debounce to prevent rapid consecutive calls
      const timeoutId = setTimeout(() => {
        loadSessionsHistory();
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [open, user, authLoading, loadChatSessions]);

  // Initialize chat with proper session management
  useEffect(() => {
    // We need to make sure this only runs once per component mount
    let isMounted = true;
    let isInitializing = false;
    
    const initializeChat = async () => {
      // Skip if already initialized or initializing
      if (!isMounted || isInitializing) return;
      
      // Set initializing flag to prevent duplicate initialization
      isInitializing = true;
      
      try {
        console.log('Initializing chat...');
        
        // First check if a session is already active and initialized
        if (sessionId) {
          console.log('There is already an active session, using it:', sessionId);
          
          // If there are materials from context, add them to the existing session
          if (contextMaterials.length > 0) {
            console.log('Adding materials to active session');
            setSelectedMaterials(prev => {
              // Filter out any materials from contextMaterials that already exist in prev
              const newMaterials = contextMaterials.filter(newMat => 
                !prev.some(existingMat => existingMat.id === newMat.id)
              );
              return [...prev, ...newMaterials];
            });
            // Reset context materials after consuming them
            setContextMaterials([]);
          }
          
          // Already have an active session, just ensure it's marked as active
          setHasActiveSession(true);
          return;
        }
        
        // If we get here, there's no active session yet
        // If the user has explicitly requested to create a new session or there are materials to add
        if (createNewSession || contextMaterials.length > 0) {
          // Check if we have an existing session we can use from localStorage
          const existingSessionId = localStorage.getItem('chatSessionId');
          
          // Only try to load existing session if we have one AND we're not explicitly creating a new one
          if (existingSessionId && !createNewSession) {
            console.log('Found existing session ID in localStorage:', existingSessionId);
            const sessionLoaded = await loadExistingMessages(existingSessionId);
            
            if (sessionLoaded) {
              console.log('Successfully loaded existing session');
              setSessionId(existingSessionId);
              setHasActiveSession(true);
              
              // If there are materials from context, add them to the existing session
              if (contextMaterials.length > 0) {
                console.log('Adding materials to existing session');
                setSelectedMaterials(prev => {
                  // Filter out any materials from contextMaterials that already exist in prev
                  const newMaterials = contextMaterials.filter(newMat => 
                    !prev.some(existingMat => existingMat.id === newMat.id)
                  );
                  return [...prev, ...newMaterials];
                });
                // Reset context materials after consuming them
                setContextMaterials([]);
              }
              
              return; // Exit early if we successfully loaded an existing session
            }
          }
          
          // If we get here, either there was no existing session, loading it failed, 
          // or we explicitly want a new session
          
          // Create a new session
          console.log('Creating new session as needed');
          await createNewChatSession();
          setCreateNewSession(false); // Reset the flag
          
          // If there are materials from context, add them to selected materials
          if (contextMaterials.length > 0) {
            // For new sessions, ensure no duplicates among the context materials themselves
            const uniqueMaterials = contextMaterials.reduce((acc: MentionedMaterial[], material) => {
              if (!acc.some(m => m.id === material.id)) {
                acc.push(material);
              }
              return acc;
            }, []);
            
            setSelectedMaterials(uniqueMaterials);
            // Reset context materials after consuming them
            setContextMaterials([]);
          }
          
          // Mark that we now have an active session
          setHasActiveSession(true);
        } else {
          // No explicit session creation requested and no materials to add
          // Just clear any invalid session data but don't create a new one
          console.log('No session creation requested, clearing any invalid session data');
          localStorage.removeItem('chatSessionId');
          setSessionId(null);
          setMessages([]);
          setHasActiveSession(false);
        }
        
        console.log('Chat initialization complete');
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (isMounted) {
          setErrorMessage('Failed to initialize chat. Please try again.');
          
          // Ensure everything is cleared even on error
          localStorage.removeItem('chatSessionId');
          setSessionId(null);
          setMessages([]);
          setHasActiveSession(false);
        }
      }
    };
    
    // Initialize on mount if user is authenticated and sidebar is open
    if (user && !authLoading && open) {
      initializeChat();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, open, createNewSession, contextMaterials, setHasActiveSession, createNewChatSession, sessionId, setContextMaterials, setCreateNewSession]);

  
  // Load existing messages for a session with enhanced error handling
  const loadExistingMessages = async (sessionId: string) => {
    if (!sessionId) {
      console.log('No session ID provided to loadExistingMessages');
      return false; // Return false to indicate no messages were loaded
    }
    
    try {
      setIsLoading(true);
      
      // First, verify the session exists by making a direct API call
      try {
        // The apiClient will automatically add the JWT token to the request
        await apiClient.get(`/chat/sessions/${sessionId}`);
      } catch (e: unknown) {
        const sessionError = e as AxiosError<{ message?: string }>; // Assuming AxiosError or similar structure
        // If the session doesn't exist, clean up and return false
        if (sessionError.response && sessionError.response.status === 404) {
          console.log(`Session ${sessionId} not found, removing from localStorage`);
          localStorage.removeItem('chatSessionId');
          
          // Remove from sessions list too
          setChatSessions(prev => prev.filter(s => s.id !== sessionId));
          
          // Clear UI state
          setSessionId(null);
          setMessages([]);
          
          return false;
        }
        // For other errors related to session retrieval, rethrow
        throw sessionError;
      }
      
      // If we get here, the session exists, so try to load its messages
      console.log('Loading messages for verified session:', sessionId);
      
      try {
        // The apiClient will automatically add the JWT token to the request
        const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
        
        // With apiClient, the response itself is the data returned by the server
        const data = response as { id: string; content: string; role: string; createdAt?: string; citations?: MessageCitation[] }[];
        console.log('Loaded messages:', data);
        
        if (data && Array.isArray(data)) {
          // Transform messages to match our format
          const formattedMessages: LecsiMessage[] = data.map((msg: { id: string; content: string; role: string; createdAt?: string; citations?: MessageCitation[] }) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role.toLowerCase() as "user" | "ai", // Assuming backend sends 'user' or 'ai'
            createdAt: msg.createdAt || new Date().toISOString(),
            citations: msg.citations || [],
          }));
          
          setMessages(formattedMessages);
          return true; // Successfully loaded messages
        }
        
        // If we got a response but no valid data, just show an empty chat
        setMessages([]);
        return true; // Session exists but might be empty
      } catch (e: unknown) {
        const messagesError = e as AxiosError<{ message?: string }>; // Assuming AxiosError or similar structure
        // If we couldn't load messages but the session exists
        console.error('Error loading messages for existing session:', messagesError);
        
        if (messagesError.response && messagesError.response.status === 404) {
          // Session exists but no messages endpoint
          setErrorMessage('This chat session exists but has no messages.');
        } else {
          setErrorMessage(`Failed to load messages: ${messagesError.message || 'Unknown error'}`);
        }
        
        // Still return true since the session exists
        setMessages([]);
        return true;
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      // This catches any other errors in the overall process
      console.error('Unexpected error in loadExistingMessages:', error);
      setErrorMessage(`Error loading chat session: ${error.message || 'Unknown error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };  // Scroll to bottom as the last message content updates (during streaming)
  const lastMessageContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lastMessageContent]);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Focus search input when search is shown
  useEffect(() => {
    if (showMentionSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMentionSearch]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target as Node) &&
        event.target instanceof Node &&
        !((event.target as HTMLElement).classList?.contains('mention-trigger'))
      ) {
        setShowMentionSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch and process study materials
  const searchStudyMaterials = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    console.log('Starting search for study materials with query:', query);
    
    try {
      // Parse query to extract course/folder paths
      const segments = query.split('/');
      const searchTerm = segments[segments.length - 1];
      // Normalize parent path segments - replace spaces with underscores to match path building
      const parentPath = segments.slice(0, -1).map(segment => segment.trim().replace(/ /g, '_'));
      console.log('Parsed query:', { searchTerm, parentPath });
      console.log('Normalized parent path:', parentPath);
      
      // Make individual API calls with error handling for each
      let coursesRes, foldersRes, filesRes, quizzesRes, decksRes;
      
      try {
        console.log('Fetching courses...');
        const courses = await apiClient.get<{ id: string; name: string; }[]>('/courses');
        coursesRes = { data: courses };
        console.log('Courses fetched successfully:', courses.length);
      } catch (error) {
        console.error('Error fetching courses:', error);
        coursesRes = { data: [] };
      }
      
      try {
        console.log('Fetching folders...');
        const folders = await apiClient.get<{ id: string; name: string; parentId?: string; courseId: string; }[]>('/folders');
        foldersRes = { data: folders };
        console.log('Folders fetched successfully:', folders.length);
      } catch (error) {
        console.error('Error fetching folders:', error);
        foldersRes = { data: [] };
      }
      
      try {
        console.log('Fetching files...');
        const files = await apiClient.get<{ id: string; name: string; folderId?: string; courseId: string; }[]>('/files');
        filesRes = { data: files };
        console.log('Files fetched successfully:', files.length);
      } catch (error) {
        console.error('Error fetching files:', error);
        filesRes = { data: [] };
      }
      
      try {
        console.log('Fetching quizzes...');
        const quizzes = await apiClient.get<{ id: string; title: string; courseId: string; }[]>('/quizzes');
        quizzesRes = { data: quizzes };
        console.log('Quizzes fetched successfully:', quizzes.length);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        quizzesRes = { data: [] };
      }
      
      try {
        console.log('Fetching flashcard decks...');
        const decks = await apiClient.get<{ id: string; name: string; courseId: string; }[]>('/decks');
        decksRes = { data: decks };
        console.log('Flashcard decks fetched successfully:', decks.length);
      } catch (error) {
        console.error('Error fetching flashcard decks:', error);
        decksRes = { data: [] };
      }
      
      // Process and filter results
      let results: StudyMaterial[] = [];
      
      // Process courses
      const coursesData = coursesRes.data.map((course: { id: string; name: string; }) => ({
        id: course.id,
        name: course.name,
        type: 'course' as const,
        path: [course.name.replace(/ /g, '_')]
      }));
      
      // Process folders
      const foldersData = foldersRes.data.map((folder: { id: string; name: string; parentId?: string; courseId: string; }) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        parentId: folder.parentId === undefined ? null : folder.parentId,
        courseId: folder.courseId,
        path: [] // Initialize path property
      }));
      
      // Process files
      const filesData = filesRes.data.map((file: { id: string; name: string; folderId?: string; courseId: string; }) => ({
        id: file.id,
        name: file.name,
        type: 'file' as const,
        parentId: file.folderId === undefined ? null : file.folderId,
        courseId: file.courseId,
        path: [] // Initialize path property
      }));
      
      // Process quizzes
      const quizzesData = quizzesRes.data.map((quiz: { id: string; title: string; courseId: string; }) => ({
        id: quiz.id,
        name: quiz.title,
        type: 'quiz' as const,
        courseId: quiz.courseId,
        path: [] // Initialize path property
      }));
      
      // Process flashcard decks
      const decksData = decksRes.data.map((deck: { id: string; name: string; courseId: string; }) => ({
        id: deck.id,
        name: deck.name,
        type: "flashcardDeck" as const,
        courseId: deck.courseId,
        path: [] 
      }));

      // Build complete paths for all materials
      const allMaterials = [...coursesData, ...foldersData, ...filesData, ...quizzesData, ...decksData];
      
      // Loop through all materials and build paths
      const buildPath = (material: StudyMaterial): string[] => {
        // Ensure material.path is initialized if not present, or use it if it is.
        const path: string[] = Array.isArray(material.path) ? [...material.path] : []; 
        
        // Course materials might already have their full path or just their name.
        // If it's just the name, it's handled by the 'Add material name' section later.
        if (material.type === 'course') {
          // If path is already populated (e.g. [courseName]), return it.
          // Otherwise, it will be constructed later.
          if (path.length > 0 && path[0] === material.name.replace(/ /g, '_')) return path;
          // If path is empty, it means it's a course and its name will be added as the first element.
          // This logic is a bit redundant with later parts but ensures courses are handled.
        }
        
        // Find course name
        if (material.courseId && material.type !== 'course') {
          const course = coursesData.find((c: { id: string; name: string; }) => c.id === material.courseId);
          if (course) {
            path.push(course.name.replace(/ /g, '_'));
          }
        }
        
        // For folders and files, build folder path
        if (material.type === 'folder' || material.type === 'file') {
          if (material.parentId) {
            const buildFolderPath = (folderId: string): string[] => {
              const folder = foldersData.find((f: { id: string; name: string; parentId: string | null; courseId: string; }) => f.id === folderId);
              if (!folder) return [];
              
              if (folder.parentId) {
                return [...buildFolderPath(folder.parentId), folder.name.replace(/ /g, '_')];
              }
              
              return [folder.name.replace(/ /g, '_')];
            };
            
            path.push(...buildFolderPath(material.parentId));
          }
        }
        
        // Add material name
        if (material.type !== 'course' || path.length === 0) {
          // Add a null check to handle materials with missing names
          if (material.name) {
            path.push(material.name.replace(/ /g, '_'));
          } else {
            // Provide a fallback for materials with no name
            console.log('Warning: Material has no name:', material);
            path.push(`unnamed_${material.type}_${material.id}`);
          }
        }
        
        return path;
      };
      
      // Assign paths to all materials
      allMaterials.forEach((material: StudyMaterial) => {
        material.path = buildPath(material);
      });
      
      // Filter based on search criteria
      if (parentPath.length > 0) {
        // Hierarchical search (course/folder/etc)
        results = allMaterials.filter((material: StudyMaterial) => {
          if (!material.path || material.path.length < parentPath.length) return false;
          
          // Check if parent path matches
          for (let i = 0; i <parentPath.length; i++) {
            if (material.path[i].toLowerCase() !== parentPath[i].toLowerCase()) {
              return false;
            }
          }
          
          // Match the last segment against search term
          if (!material.name) {
            console.log(`Skipping material with no name in hierarchical search:`, material);
            return false;
          }
          const name = material.name.toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      } else {
        // Simple search across all materials
        results = allMaterials.filter((material: StudyMaterial) => {
          // Skip materials with undefined names
          if (!material.name) {
            console.log(`Skipping material with no name:`, material);
            return false;
          }
          const name = material.name.toLowerCase();
          return name.includes(searchTerm.toLowerCase());
        });
      }
      
      // Sort results by relevance (exact matches first, then contains)
      results.sort((a, b) => {
        // Skip sort comparison for items with missing names
        if (!a.name || !b.name) return 0;
        
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        return aName.localeCompare(bName);
      });
      
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      const axiosError = error as AxiosError<unknown>;
      console.error('Error searching study materials:', axiosError);
      // More detailed error logging
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', axiosError.response.data);
        console.error('Error response status:', axiosError.response.status);
        console.error('Error response headers:', axiosError.response.headers);
      } else if (axiosError.request) {
        // The request was made but no response was received
        console.error('Error request:', axiosError.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', axiosError.message);
      }
      
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      console.log('Search completed');
    }
  };
  
  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMentionSearchQuery(query);
    
    // When the user first interacts with the search bar, remove the @ from the chat input
    if (!mentionSearchQuery && query) {
      // Find the last @ character in the message
      const lastAtPos = inputValue.lastIndexOf('@');
      if (lastAtPos !== -1) {
        // Check if this is the @ that triggered the search
        const messageAfterAt = inputValue.slice(lastAtPos + 1).trim();
        if (messageAfterAt === '') {
          // If the @ is the last character or followed only by spaces, remove just the @
          const newMessage = inputValue.slice(0, lastAtPos) + ' ';
          console.log('Removing @ character from chat input');
          setInputValue(newMessage.trimEnd());
        } else {
          // Only remove the @ if it's the last non-space character
          const lastNonSpaceCharPos = inputValue.trimEnd().length - 1;
          if (lastAtPos === lastNonSpaceCharPos) {
            const newMessage = inputValue.slice(0, lastAtPos);
            console.log('Removing @ character from chat input');
            setInputValue(newMessage.trimEnd());
          }
        }
      }
    }
    
    searchStudyMaterials(query);
  };
  
  // Handle selection of a study material
  const handleSelectMaterial = (material: StudyMaterial) => {
    // Handle materials with missing names
    if (!material.name) {
      console.warn('Attempted to select a material with no name:', material);
      return;
    }
    
    // Create a mentioned material object
    const mentionedMaterial: MentionedMaterial = {
      id: material.id,
      displayName: material.path?.join('/') || material.name.replace(/ /g, '_'),
      type: material.type,
      originalName: material.name,
      courseId: material.courseId || material.id // For courses, courseId is the course's own id
    };
    
    // Check if this material is already selected
    if (selectedMaterials.some(m => m.id === mentionedMaterial.id)) {
      console.log('This material is already selected');
      // Show a message or handle as needed
      return;
    }
    
    // Add to selected materials
    setSelectedMaterials(prev => [...prev, mentionedMaterial]);
    
    // Clear search
    setMentionSearchQuery('');
    setShowMentionSearch(false);
    setSearchResults([]);
  };
  
  // Handle keydown in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleSelectMaterial(searchResults[0]);
    } else if (e.key === 'Escape') {
      setShowMentionSearch(false);
    }
  };
  
  // Handle removing a selected material
  const handleRemoveMaterial = (id: string) => {
    setSelectedMaterials(prev => prev.filter(material => material.id !== id));
  };

  // Toggle mention search
  const toggleMentionSearch = () => {
    setShowMentionSearch(prev => !prev);
    if (!showMentionSearch) {
      setMentionSearchQuery('');
      setSearchResults([]);
    }
  };

  if (!user) return null;

  // Function to handle sending a message
  const handleChatMessageSubmit = async (message: string) => {
    // Validate subscription limits based on chat mode
    if (chatMode === 'lite' && !canUseLiteMessage) {
      toast.error('You have reached your Lite message limit for this billing period.');
      return;
    }
    
    if (chatMode === 'think' && !canUseThinkMessage) {
      toast.error('You have reached your Think message limit for this billing period.');
      return;
    }
    
    // If subscription isn't active, don't allow sending messages
    if (!isActive) {
      toast.error('Your subscription is inactive. Please renew to continue using this feature.');
      return;
    }
    setInputValue(message);
    
    // Check if the user just typed @
    const lastAtPos = message.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || message[lastAtPos - 1] === ' ')) {
      // Check if there's a space immediately after the @ character
      const charAfterAt = message.charAt(lastAtPos + 1);
      if (charAfterAt === ' ') {
        // If there's a space after @, disable mention functionality
        setShowMentionSearch(false);
        console.log('Mention functionality disabled due to space after @');
        return;
      }
      
      // Extract the search query after @
      const searchQuery = message.slice(lastAtPos + 1).split(' ')[0];
      if (searchQuery) {
        setMentionSearchQuery(searchQuery);
        searchStudyMaterials(searchQuery);
        setShowMentionSearch(true);
      } else {
        setShowMentionSearch(true);
        setMentionSearchQuery('');
        setSearchResults([]);
      }
    }
    
    try {
      setIsLoading(true);
      
      
      // Clean message content for backend - remove @ mentions of selected materials
      let cleanedMessage = message;
      
      // Remove @ mentions of selected materials from the message
      if (selectedMaterials.length > 0) {
        selectedMaterials.forEach(material => {
          // Create regex patterns to match different forms of the mention
          const patterns = [
            new RegExp(`@${material.displayName}\b`, 'g'),  // Match exact display name
            new RegExp(`@${material.originalName.replace(/ /g, '_')}\b`, 'g')  // Match with underscores
          ];
          
          // Remove all patterns from the message
          patterns.forEach(pattern => {
            cleanedMessage = cleanedMessage.replace(pattern, '');
          });
        });
        
        // Clean up any remaining whitespace issues
        cleanedMessage = cleanedMessage.replace(/\s+/g, ' ').trim();
      }
      
      // Create user message with cleaned content for display
      // This prevents the @ mentions from appearing in the message text
      const userMsg: LecsiMessage = {
        id: Date.now().toString(),
        content: cleanedMessage, // Use cleaned message without @ mentions for display
        role: "user",
        createdAt: new Date().toISOString(),
        // Add selectedMaterials to the message so they can be displayed in the "See mentions" dropdown
        selectedMaterials: selectedMaterials.length > 0 ? [...selectedMaterials] : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      console.log('📝 [LecsiChatSidebar] Added user message to state. ID:', userMsg.id, 'Content:', userMsg.content);
      
      // Extract IDs from selected materials by type
      const fileIds = selectedMaterials
        .filter(material => material.type === 'file')
        .map(material => material.id);
        
      const folderIds = selectedMaterials
        .filter(material => material.type === 'folder')
        .map(material => material.id);
        
      const flashCardDeckIds = selectedMaterials
        .filter(material => material.type === 'flashcardDeck')
        .map(material => material.id);
        
      const quizIds = selectedMaterials
        .filter(material => material.type === 'quiz')
        .map(material => material.id);
      
      // If we don't have a session ID yet, create one
      if (!sessionId) {
        await createNewChatSession();
        
        // If still no sessionId after attempted creation, abort
        if (!sessionId) {
          throw new Error('Could not create a chat session');
        }
      }
      
      // Only include courseId if a course was explicitly selected by the user
      // This prevents sending the course ID when user only selects specific files/folders/etc.
      const courseMaterials = selectedMaterials.filter(material => material.type === 'course');
      const courseId = courseMaterials.length > 0 ? courseMaterials[0].id : null;
      
      // Prepare request body
      const requestBody = {
        content: cleanedMessage, // Use cleaned message without @ mentions
        flashCardDeckIds,
        quizIds,
        fileIds,
        folderIds,
        // Only include courseId if a course was explicitly selected
        ...(courseId ? { courseId } : {}),
        thinkMode: chatMode === 'think',
      };
      
      // Create a placeholder for the AI response
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: LecsiMessage = {
        id: aiMsgId,
        content: '',
        role: "ai",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      console.log('🤖 [LecsiChatSidebar] Added empty AI message placeholder to state. ID:', aiMsgId);
      
      // At this point, sessionId should be valid as we've either loaded it or created a new one
      // TypeScript safety check
      if (!sessionId) {
        throw new Error('Session ID is still not available after creation attempt');
      }
      
      // For streaming responses, we need to get the token from localStorage
      // since we're using native fetch API to support streaming
      const token = localStorage.getItem('token'); // Use the correct token key
      
      // Use the same API URL that apiClient uses
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('Sending message to:', `${apiUrl}/chat/sessions/${sessionId}/messages`);
      
      // Make the streaming API call with the valid sessionId and auth token
      // Use apiClient instead of raw fetch for better consistency with auth handling
      console.log('Sending message to session:', sessionId);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      try {
        // First check if the session exists to avoid 404 errors
        await apiClient.get(`/chat/sessions/${sessionId}`);
        
        // Now make the streaming request
        const response = await fetch(`${apiUrl}/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'text/event-stream', // Important for streaming
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error: ${response.status}`, errorText);
          
          // Improve error handling for 404 errors
          if (response.status === 404) {
            setErrorMessage('Chat session not found. Please create a new session.');
            localStorage.removeItem('chatSessionId');
            setSessionId(null);
          } else {
            setErrorMessage(`API error: ${response.status} - ${errorText}`);
          }
          throw new Error(`API error: ${response.status} ${errorText}`);
        }
        
        // Check if ReadableStream is supported
        if (response.body) {
          console.log('Streaming API response available, starting to read chunks...');
          const reader = response.body.getReader();
          let streamedContent = '';
          
          // Read the stream
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log('🎯 [LecsiChatSidebar] Stream complete. Fetching saved messages...');
                try {
                  const msgs = await apiClient.get<LecsiMessage[]>(`/chat/sessions/${sessionId}/messages`);
                  console.log('🔄 [LecsiChatSidebar] Updating messages with server state:', msgs);
                  setMessages(msgs);
                } catch (err) {
                  console.error('❌ [LecsiChatSidebar] Failed to fetch messages:', err);
                }
                break;
              }
              
              // Decode the chunk
              const chunk = new TextDecoder().decode(value);
              console.log('📦 [LecsiChatSidebar] Received raw chunk (length:', chunk.length, '):', chunk);
              
              if (chunk.trim()) {
                // For each SSE 'data:' line, parse JSON and append only text
                const lines = chunk.split('\n');
                let delta = '';
                for (const line of lines) {
                  if (!line.startsWith('data:')) continue;
                  const raw = line.substring(5).trim();
                  if (!raw || raw === '{}') continue;
                  try {
                    const parsed = JSON.parse(raw) as { text?: string } | string;
                    if (parsed && typeof parsed === 'object' && 'text' in parsed) {
                      const text = parsed.text;
                      if (text) delta += text;
                      continue;
                    }
                    if (typeof parsed === 'string') {
                      delta += parsed;
                      continue;
                    }
                  } catch {
                    // Not JSON; treat raw as text (strip surrounding quotes)
                    if (raw.startsWith('"') && raw.endsWith('"')) {
                      delta += raw.slice(1, -1);
                    } else {
                      delta += raw;
                    }
                    continue;
                  }
                }
                if (delta) {
                  // Append to buffer and update UI incrementally
                  streamedContent += delta;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === aiMsgId ? { ...msg, content: streamedContent } : msg
                    )
                  );
                }
              }
            }
          } catch (streamError) {
            console.error('Error reading stream:', streamError);
            setErrorMessage('Error receiving response from Lecsi');
          }
        } else {
          console.warn('ReadableStream not supported or response body is null');
          setErrorMessage('Your browser does not support streaming responses');
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
        setErrorMessage('Failed to send message to Lecsi');
      }
      
      // Clear selected materials after sending
      setSelectedMaterials([]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Set the error message for the error banner
      setErrorMessage('Failed to send message. Please try again.');
      
      // Show error message to user in chat
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: 'Sorry, there was an error processing your request. Please try again.',
          role: 'ai',
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Track @ input in the chat message
  const handleMessageChange = (message: string) => {
    setInputValue(message);
    
    // Check if the user just typed @
    const lastAtPos = message.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || message[lastAtPos - 1] === ' ')) {
      // Check if there's a space immediately after the @ character
      const charAfterAt = message.charAt(lastAtPos + 1);
      if (charAfterAt === ' ') {
        // If there's a space after @, disable mention functionality
        setShowMentionSearch(false);
        console.log('Mention functionality disabled due to space after @');
        return;
      }
      
      // Extract the search query after @
      const searchQuery = message.slice(lastAtPos + 1).split(' ')[0];
      if (searchQuery) {
        setMentionSearchQuery(searchQuery);
        searchStudyMaterials(searchQuery);
        setShowMentionSearch(true);
      } else {
        setShowMentionSearch(true);
        setMentionSearchQuery('');
        setSearchResults([]);
      }
    }
  };

  // Create a new chat session and switch to it
  const handleCreateNewChat = async () => {
    try {
      setIsLoading(true);
      const newSessionId = await createNewChatSession(); // This returns string | null
      if (newSessionId) {
        setSessionId(newSessionId);
        localStorage.setItem('chatSessionId', newSessionId);
      } else {
        // Handle the case where session creation failed and newSessionId is null
        console.error('Failed to create new chat session in handleCreateNewChat as createNewChatSession returned null.');
        // setErrorMessage is already in the catch block, but we might want a specific one here
        // For now, the existing catch block will handle the user-facing error message.
        // We might want to throw an error here to be caught by the catch block or return early.
        return; // Exit if session creation failed
      }
      setMessages([]);
      setShowSessionsHistory(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      setErrorMessage('Failed to create new chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to another chat session - simplified now that loadExistingMessages is more robust
  const handleSwitchSession = async (sessionId: string) => {
    if (!sessionId) {
      console.error('Attempted to switch to session with null or undefined ID');
      setErrorMessage('Invalid chat session selected.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Our improved loadExistingMessages already verifies the session exists
      // and handles errors appropriately
      const messagesLoaded = await loadExistingMessages(sessionId);
      
      if (messagesLoaded) {
        // Session exists and messages were loaded (even if empty)
        setSessionId(sessionId);
        localStorage.setItem('chatSessionId', sessionId);
        setShowSessionsHistory(false);
        console.log('Successfully switched to session:', sessionId);
      } else {
        // loadExistingMessages returned false - session likely doesn't exist
        // and has already been removed from the list in loadExistingMessages
        console.log('Could not load session, it may no longer exist:', sessionId);
        
        // Clear any related data
        if (sessionId === localStorage.getItem('chatSessionId')) {
          localStorage.removeItem('chatSessionId');
        }
        
        // Make sure the session is removed from the UI list too
        setChatSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // Show a message to the user
        setErrorMessage('The selected chat session is no longer available.');
      }
    } catch (error) {
      console.error('Unexpected error in handleSwitchSession:', error);
      setErrorMessage('Failed to switch to the selected chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Error message banner */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          <div className="flex items-center">
            <span className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </span>
            <span>{errorMessage}</span>
            <button 
              className="ml-3 focus:outline-none" 
              onClick={() => setErrorMessage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Toggle Button */}
      <button
        className={`fixed top-2/12 right-12 z-40 bg-[var(--primary)] text-white px-3 py-2 rounded-l-lg shadow-lg transition-transform translate-x-[calc(100%-2.5rem)]`}
        style={{
          transform: open
            ? (hover ? "translateX(-6px)" : "translateX(0)")
            : (hover ? "translateX(calc(-2.5rem - 10px))" : "translateX(-2.5rem)"),
          transition: 'transform 0.2s',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Hide Lecsi chat" : "Show Lecsi chat"}
      >
        <div className="flex items-center gap-1"><span className="mr-1 font-bold">←</span><span className="font-bold">Lecsi</span> <span className="text-4xl">👩🏻‍🦰</span></div>
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="lecsi-sidebar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            style={{ maxWidth: 400 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[var(--primary)] text-white">
              <div className="flex items-center">
                <span className="font-semibold text-lg">Lecsi <span className="text-3xl ml-1">👩🏻‍🦰</span></span>
                <div className="flex ml-3 space-x-2">
                  <button 
                    onClick={handleCreateNewChat}
                    className="p-1 hover:bg-[var(--primary-dark)] rounded transition-colors" 
                    title="New Chat"
                    aria-label="Create new chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setShowSessionsHistory(!showSessionsHistory)}
                    className="p-1 hover:bg-[var(--primary-dark)] rounded transition-colors" 
                    title="Chat History"
                    aria-label="View chat history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.553.895l2.5 1.5a1 1 0 10.894-1.79L11 10.382V7z" 
                      clipRule="evenodd" 
                    />
                  </svg>

                  </button>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close Lecsi chat" className="text-xl font-bold hover:text-[var(--orange-light)]">×</button>
            </div>
            {/* Chat history panel */}
            {showSessionsHistory && (
              <div className="absolute inset-0 z-10 bg-white flex flex-col" style={{top: '56px'}}>
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-medium">Chat History</h3>
                  <button 
                    onClick={() => setShowSessionsHistory(!showSessionsHistory)}
                    className="p-1 hover:bg-[var(--primary-dark)] rounded transition-colors" 
                    title="Chat History"
                    aria-label="View chat history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.553.895l2.5 1.5a1 1 0 10.894-1.79L11 10.382V7z" 
                        clipRule="evenodd" 
                      />
                    </svg>

                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {isLoadingSessions ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
                    </div>
                  ) : chatSessions.length > 0 ? (
                    <div className="space-y-2">
                      {chatSessions.map(session => (
                        <div 
                          key={session.id}
                          className={`p-3 rounded border ${sessionId === session.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
                          onClick={() => handleSwitchSession(session.id)}
                        >
                          <p className="font-medium truncate">{session.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <p>No chat history found</p>
                      <button 
                        onClick={handleCreateNewChat}
                        className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-dark)] transition-colors"
                      >
                        Start a new chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
              {!sessionId ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-400px)] text-gray-500 text-center">
                  <p className="mb-2">No active chat session</p>
                  <button 
                    onClick={handleCreateNewChat} 
                    className="mt-2 px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-dark)] transition-colors"
                  >
                    Start a new chat
                  </button>
                  <p className="mt-2">or</p>
                  <button
                    onClick={() => setShowSessionsHistory(true)}
                    className="mt-2 px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-dark)] transition-colors"
                  >
                    Load a previous chat
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-gray-500 text-center mt-8">Say hello to Lecsi, your AI assistant!</div>
              ) : (
                messages.map((msg) => {
                  console.log('🎨 [LecsiChatSidebar] Rendering message ID:', msg.id, 'Role:', msg.role, 'Content length:', msg.content.length);
                  console.log('🎨 [LecsiChatSidebar] Message content preview (first 200 chars):', msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''));
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={{
                        id: msg.id,
                        content: msg.content,
                        role: msg.role === "user" ? MessageRole.USER : MessageRole.AI, // Adjust if you use enums
                        createdAt: msg.createdAt,
                        chatSessionId: "lecsi-global",
                        citations: msg.citations || [],
                        // Pass the selectedMaterials for the "See mentions" dropdown
                        selectedMaterials: msg.selectedMaterials,
                      }}
                      onClickCitation={() => {}}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Mention search dropdown */}
            {showMentionSearch && (
                <div className="p-3 bg-gray-50" ref={searchResultsRef}>
                  <div>
                    {/* Search results */}
                    {mentionSearchQuery && (
                      <div className="w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mb-3">
                        {isSearching ? (
                          <div className="p-3 text-center text-gray-500">Searching...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-3 text-center text-gray-500">No results found</div>
                        ) : (
                          <ul>
                            {searchResults.map((item, index) => (
                              <li 
                                key={item.id}
                                className={`p-2 hover:bg-gray-100 cursor-pointer ${index === 0 ? 'bg-gray-50 border-l-2 border-[var(--primary)]' : ''}`}
                                onClick={() => handleSelectMaterial(item)}
                              >
                                <div className="flex items-center">
                                  <span className="mr-2">
                                    {item.type === 'course' && '📚'}
                                    {item.type === 'folder' && '📁'}
                                    {item.type === 'file' && '📄'}
                                    {item.type === 'quiz' && '❓'}
                                    {item.type === 'flashcardDeck' && '🔤'}
                                  </span>
                                  <div>
                                    <div className="font-medium">{item.name || `Unnamed ${item.type} (${item.id.slice(0, 8)})`}</div>
                                    <div className="text-xs text-gray-500">{item.path?.join('/')}</div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <div className="flex items-center bg-white border border-gray-300 rounded-md overflow-hidden">
                      <span className="text-lg font-medium px-2 text-gray-500">@</span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="flex-grow p-2 outline-none"
                        placeholder="Search courses, files, folders, quizzes, flashcards..."
                        value={mentionSearchQuery}
                        onChange={handleSearchInputChange}
                        onKeyDown={handleSearchKeyDown}
                      />
                    </div>
                  </div>
                </div>
              )}
              
            <div className="border-t border-[var(--primary)] p-3 bg-white">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md overflow-hidden border border-[var(--primary)]">
                    <button
                      className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${chatMode === 'lite' ? 'bg-[var(--primary)] text-white' : 'bg-white text-[var(--primary)] hover:bg-gray-100'}`}
                      onClick={() => setChatMode('lite')}
                      aria-label="Switch to Lite mode"
                    >
                      <span className="font-medium">Lite</span>
                    </button>
                    <button
                      className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${chatMode === 'think' ? 'bg-[var(--primary)] text-white' : 'bg-white text-[var(--primary)] hover:bg-gray-100'}`}
                      onClick={() => setChatMode('think')}
                      aria-label="Switch to Think mode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      <span className="font-medium">Think</span>
                    </button>
                  </div>
                  {/* Information icon */}
                  {/* Info icon with custom tooltip */}
                  <span className="relative group inline-flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 cursor-pointer" style={{ color: 'var(--primary)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* Tooltip */}
                    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-3 w-[350px] bg-white text-gray-900 text-sm rounded-lg shadow-lg px-4 py-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
                         style={{ minWidth: '320px' }}
                    >
                      <div className="font-semibold mb-1 text-[var(--primary)]">How Lecsi uses your question and materials:</div>
                      <div className="mb-2">
                        Generic questions that <span className="font-semibold">don&apos;t mention specific topics</span> will make Lecsi only read up to <span className="font-semibold">4</span> of the attached study materials. If the question is generic and no study materials are added as context to the conversation, Lecsi could have issues understanding your question. It is <span className="font-semibold">always recommended</span> to attach study materials to the conversation as context, via the @ functionality.
                      </div>
                      <div className="mb-1 font-semibold">Examples of generic questions or queries:</div>
                      <ul className="mb-2 list-decimal list-inside text-gray-700">
                        <li>What are the main points treated in these files?</li>
                        <li>Write a summary of the methods of this file.</li>
                      </ul>
                      <div className="mb-1 font-semibold">Examples of specific questions or queries:</div>
                      <ul className="list-decimal list-inside text-gray-700">
                        <li>What is the difference between Sigmund Freud&apos;s and Carl Jung&apos;s psychoanalysis theories?</li>
                        <li>How many ATP molecules does a Krebs cycle produce?</li>
                      </ul>
                      {/* Tooltip arrow */}
                      <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 overflow-hidden">
                        <div className="w-3 h-3 bg-white rotate-45 shadow-md"></div>
                      </div>
                    </div>
                  </span>
                </div>
                <Button
                  variant="white-outline"
                  size="sm"
                  className="px-2.5 py-1.5 mention-trigger"
                  title="Mention content from across the app"
                  aria-label="Mention context"
                  onClick={toggleMentionSearch}
                >
                  <span className="text-lg font-medium leading-none inline-block align-text-bottom">@</span>
                </Button>
              </div>
              
              {/* Display selected materials */}
              {selectedMaterials.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedMaterials.map(material => (
                    <div 
                      key={material.id} 
                      className="inline-flex items-center bg-[var(--light-blue)] text-[var(--primary)] px-2 py-1 rounded-md text-sm"
                    >
                      <span className="mr-1">
                        {material.type === 'course' && '📚'}
                        {material.type === 'folder' && '📁'}
                        {material.type === 'file' && '📄'}
                        {material.type === 'quiz' && '❓'}
                        {material.type === 'flashcardDeck' && '🔤'}
                      </span>
                      <span>{material.displayName}</span>
                      <button 
                        className="ml-1 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveMaterial(material.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Warning message for limit reached or inactive subscription */}
              {(chatMode === 'lite' && !canUseLiteMessage) && (
                <div className="px-4 py-2 mb-2 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  You have reached your Lite message limit for this billing period.
                </div>
              )}
              {(chatMode === 'think' && !canUseThinkMessage) && (
                <div className="px-4 py-2 mb-2 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  You have reached your Think message limit for this billing period.
                </div>
              )}
              {/* When subscription is inactive but there are still messages left */}
              {!isActive && (
                <div className="px-4 py-2 mb-2 text-sm text-yellow-800 bg-yellow-50 rounded-md border border-yellow-200">
                  Your subscription is inactive. You can still use your remaining {chatMode === 'lite' ? 'Lite' : 'Think'} messages.
                </div>
              )}
              
              <ChatInputForm 
                onSendMessage={handleChatMessageSubmit} 
                isLoading={isLoading} 
                onInputChange={handleMessageChange}
                selectedMaterials={selectedMaterials}
                message={inputValue}
                setMessage={setInputValue}
                liteMode={chatMode === 'lite'}
                thinkMode={chatMode === 'think'}
                liteDisabled={!sessionId || !canUseLiteMessage}
                thinkDisabled={!sessionId || !canUseThinkMessage}
                lastChangeWasExternal={lastChangeWasExternal}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
