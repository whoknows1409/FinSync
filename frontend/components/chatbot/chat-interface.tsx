// frontend/components/chatbot/chat-interface.tsx
"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  Share2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MonitorSpeaker,
  Square
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { geminiAPI, isGeminiConfigured, type GeminiMessage } from "@/lib/gemini-api"
import { toast } from "sonner"
import { chatbotAPI } from "@/lib/api-service"
import { ChatExport } from "./chat-export"
import { formatDateInIST, formatTimeInIST } from "@/lib/date-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageRenderer } from "./message-renderer"

// Utility function to remove markdown formatting
const removeMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
    .replace(/__(.*?)__/g, '$1')       // Remove __underline__
    .replace(/`(.*?)`/g, '$1')        // Remove `code`
    .replace(/#+\s*(.*?)\s*$/gm, '$1') // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove images but keep alt text
    .replace(/^>\s*(.*?)$/gm, '$1')   // Remove blockquotes
    .replace(/^-{3,}$/gm, '')         // Remove horizontal rules
    .replace(/`{3,}[\s\S]*?`{3,}/g, '') // Remove code blocks
    .trim();
}

// Date separator component
const DateSeparator = ({ date }: { date: Date }) => {
  const formattedDate = formatDateInIST(date);
  return (
    <div className="flex justify-center my-2">
      <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
        {formattedDate}
      </div>
    </div>
  );
};

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isError?: boolean
}

interface ChatHistoryItem {
  _id: string
  title: string
  date: string
  createdAt: string
  timestamp: string
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: string
  }>
  promptCount: number
}

interface ChatInterfaceProps {
  selectedChat?: ChatHistoryItem | null
  onNewChat?: () => void
  onLoadChat?: (chat: ChatHistoryItem) => void
  isNewChat?: boolean
  onChatUpdated?: () => void
  updateChatInHistory?: (chat: ChatHistoryItem) => void
}

const MAX_PROMPTS_PER_CHAT = 10
const TYPING_SPEED = 10 // milliseconds per character

// Output mode options
type OutputMode = 'text' | 'voice' | 'both';

export function ChatInterface({ 
  selectedChat, 
  onNewChat, 
  onLoadChat, 
  isNewChat = false,
  onChatUpdated,
  updateChatInHistory
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm Finsync AI, your personal financial assistant. I can help you with budgeting, investing, stock analysis, and financial planning. How can I assist you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [chatId, setChatId] = useState<string>(Date.now().toString())
  const [promptCount, setPromptCount] = useState(0)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [hasFirstReply, setHasFirstReply] = useState(false) // Track if first AI reply has been received
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const isChatLoaded = useRef(false)
  const lastSavedMessages = useRef<Message[]>([])
  
  // Typing effect states
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [typingContent, setTypingContent] = useState("")
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false) // Track overall response generation state
  const isCancelledRef = useRef(false) // Track if current request was cancelled
  
  // Sticky header state
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  
  // Voice interaction states
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [outputMode, setOutputMode] = useState<OutputMode>('text') // Default to text only
  const speechRecognitionRef = useRef<any>(null)
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  
  // Store the generated title from backend
  const setGeneratedTitleRef = useRef<string | null>(null)
  
  // Abort controller for stopping API requests
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Check if Gemini API is configured
    const configured = isGeminiConfigured()
    setIsConfigured(configured)
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis
      
      // Load output mode preference from localStorage
      const savedOutputMode = localStorage.getItem('chatbot-output-mode') as OutputMode | null
      if (savedOutputMode && ['text', 'voice', 'both'].includes(savedOutputMode)) {
        setOutputMode(savedOutputMode)
      }
    }
  }, [])

  // Clean up typing interval, speech synthesis, and abort controller on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
      
      // Cancel any ongoing speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
      }
      
      // Abort any ongoing API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (scrollAreaRef.current && headerRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
          const scrollTop = scrollElement.scrollTop
          // Make header sticky when scrolled down more than 10px
          setIsHeaderSticky(scrollTop > 10)
        }
      }
    }

    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    // Load selected chat if provided
    if (selectedChat) {
      isChatLoaded.current = true
      const loadedMessages: Message[] = selectedChat.messages.map(msg => ({
        id: Math.random().toString(36).substring(2, 9),
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp),
      }))
      setMessages(loadedMessages)
      setChatId(selectedChat.timestamp || selectedChat._id) // Use timestamp as chatId
      setPromptCount(selectedChat.promptCount)
      
      // Check if there's already an AI reply (not the initial message)
      const hasNonInitialAIMessage = loadedMessages.some((msg, index) => 
        msg.role === 'assistant' && index !== 0
      );
      setHasFirstReply(hasNonInitialAIMessage)
      
      // Store the loaded messages to compare later
      lastSavedMessages.current = loadedMessages
    } else if (isNewChat) {
      // Reset to initial state when starting a new chat
      isChatLoaded.current = false
      setMessages([{
        id: "1",
        content: "Hello! I'm Finsync AI, your personal financial assistant. I can help you with budgeting, investing, stock analysis, and financial planning. How can I assist you today?",
        role: "assistant",
        timestamp: new Date(),
      }])
      setChatId(Date.now().toString())
      setPromptCount(0)
      setInput("")
      setHasFirstReply(false) // Reset for new chat
      // Reset the last saved messages
      lastSavedMessages.current = [{
        id: "1",
        content: "Hello! I'm Finsync AI, your personal financial assistant. I can help you with budgeting, investing, stock analysis, and financial planning. How can I assist you today?",
        role: "assistant",
        timestamp: new Date(),
      }]
    }
  }, [selectedChat, isNewChat])

  // Save chat to backend when messages change
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Skip saving if we just loaded a chat
    if (isChatLoaded.current) {
      isChatLoaded.current = false
      return
    }

    // Skip saving if there are no new messages (only the initial message)
    if (messages.length <= 1) {
      return
    }

    // Skip saving if messages haven't changed since last save
    if (messages.length === lastSavedMessages.current.length && 
        messages.every((msg, index) => 
          msg.content === lastSavedMessages.current[index].content && 
          msg.role === lastSavedMessages.current[index].role)) {
      return
    }

    // We'll use the title generated by the backend or create a fallback
    const saveChat = async () => {
      setIsGeneratingTitle(true)
      
      // Use the title from backend or generate a fallback
      let title = setGeneratedTitleRef.current;
      if (!title) {
        // Fallback to the first user message's first few words
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          const words = firstUserMessage.content.split(' ');
          title = words.slice(0, 4).join(' ');
        } else {
          title = 'Financial Chat';
        }
      }
      
      setIsGeneratingTitle(false)
      
      const chatData = {
        title,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
        promptCount,
        chatId // Pass the timestamp as chatId
      }

      // Save to backend
      chatbotAPI.saveChatHistory(chatData)
        .then(response => {
          // Update the last saved messages
          lastSavedMessages.current = [...messages]
          
          // Update the chat in the parent's chat history
          if (updateChatInHistory) {
            const updatedChat: ChatHistoryItem = {
              _id: chatId,
              title,
              date: new Date().toISOString(),
              createdAt: selectedChat?.createdAt || new Date().toISOString(),
              timestamp: chatId,
              messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString()
              })),
              promptCount
            }
            updateChatInHistory(updatedChat)
          }
          
          // Notify parent to refresh chat history
          if (onChatUpdated) {
            onChatUpdated()
          }
        })
        .catch(error => {
          console.error('Failed to save chat history:', error)
        })
    };

    saveChat();
  }, [messages, chatId, promptCount, selectedChat, onChatUpdated, updateChatInHistory])

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      
      // Auto-send the transcribed message
      if (transcript.trim()) {
        setTimeout(() => handleSend(), 300);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast.info("No speech detected. Please try again.");
      } else if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    return recognition;
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start listening
      const recognition = initSpeechRecognition();
      if (recognition) {
        speechRecognitionRef.current = recognition;
        recognition.start();
      }
    }
  };

  // Text-to-speech function
  const speakText = (text: string) => {
    if (!speechSynthesisRef.current) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Find a preferred English voice
    const voices = speechSynthesisRef.current.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en-') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.includes('en-'));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      // Don't show error for intentional interruptions (when user clicks stop)
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error', event);
        toast.error("Error playing voice output. Please try again.");
      }
      setIsSpeaking(false);
    };
    
    utteranceRef.current = utterance;
    speechSynthesisRef.current.speak(utterance);
  };

  // Stop speech
  const stopSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle output mode change
  const handleOutputModeChange = (mode: OutputMode) => {
    setOutputMode(mode);
    localStorage.setItem('chatbot-output-mode', mode);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingContent])

  // Typing effect implementation
  const startTypingEffect = (messageId: string, content: string) => {
    // Clean any existing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
    }
    
    setTypingMessageId(messageId)
    setTypingContent("")
    setIsGeneratingResponse(true) // Mark as generating
    
    let index = 0
    typingIntervalRef.current = setInterval(() => {
      if (index < content.length) {
        setTypingContent(prev => prev + content.charAt(index))
        index++
      } else {
        // Typing complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        setTypingMessageId(null)
        setTypingContent("")
        setIsGeneratingResponse(false) // Mark as complete
      }
    }, TYPING_SPEED)
  }

  const handleSend = async () => {
    // Check if input is valid before processing
    if (!input || typeof input !== 'string' || !input.trim()) {
      return
    }

    // Check if we've reached the prompt limit
    if (promptCount >= MAX_PROMPTS_PER_CHAT) {
      toast.error("You've reached the limit of 10 prompts for this chat. Please start a new chat.")
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)
    setIsGeneratingResponse(true) // Start response generation
    setPromptCount(prev => prev + 1)
    isCancelledRef.current = false // Reset cancelled flag
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Convert messages to Gemini format
      const conversationHistory: GeminiMessage[] = messages
        .filter(msg => msg.role === "assistant" || msg.role === "user")
        .map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }))

      // Use chatbotAPI to send message to backend
      // Request title generation on first user message (when history has 2 messages: greeting + user)
      const isFirstUserMessage = messages.length === 2;
      const response = await chatbotAPI.sendMessage(
        currentInput, 
        conversationHistory,
        { generateTitle: isFirstUserMessage }
      )
      
      // Check if request was cancelled while waiting for response
      if (isCancelledRef.current) {
        return; // Exit early, don't process the response
      }
      
      // Store the title if generated
      if (response.data.title) {
        setGeneratedTitleRef.current = response.data.title;
      }
      
      // Clean the response to remove markdown formatting
      const cleanedResponse = removeMarkdown(response.data.response);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: cleanedResponse,
        role: "assistant",
        timestamp: new Date(),
      }
      
      // Check again before adding message (in case cancelled during processing)
      if (isCancelledRef.current) {
        return;
      }
      
      // Add AI message and start typing effect
      setMessages((prev) => {
        const newMessages = [...prev, aiMessage];
        // If we had exactly 2 messages before (initial greeting + user message), this is the first AI reply
        if (prev.length === 2) {
          setHasFirstReply(true);
        }
        return newMessages;
      });
      
      // Start typing effect for the new AI message
      startTypingEffect(aiMessage.id, cleanedResponse);
      
      // Handle voice output based on selected mode
      if (!isCancelledRef.current && (outputMode === 'voice' || outputMode === 'both')) {
        // Use a timeout to start speaking after a short delay
        setTimeout(() => {
          if (!isCancelledRef.current) {
            speakText(cleanedResponse);
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      
      // Don't show error if request was aborted by user
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        toast.info("Response stopped")
        setIsGeneratingResponse(false) // Stop generation state
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I'm having trouble connecting to the AI service. Please check your API configuration in settings or try again later.",
          role: "assistant",
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
        toast.error("Failed to get AI response")
        setIsGeneratingResponse(false) // Stop generation state
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }
  
  const handleStopResponse = () => {
    // Set cancelled flag to prevent any pending operations
    isCancelledRef.current = true;
    
    // Abort the ongoing request if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Stop typing effect
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    
    // If we're in the middle of typing, remove the incomplete message
    if (typingMessageId) {
      setMessages((prev) => prev.filter(msg => msg.id !== typingMessageId))
      setTypingMessageId(null)
      setTypingContent("")
    }
    
    // If loading (API call in progress), remove the last user message if we haven't got a response yet
    if (isLoading && !typingMessageId) {
      // Remove the last message (user's question) since we're stopping before getting a response
      setMessages((prev) => prev.slice(0, -1))
      // Decrease prompt count since we're canceling this prompt
      setPromptCount(prev => Math.max(0, prev - 1))
    }
    
    // Stop speech
    stopSpeech()
    
    // Reset all states
    setIsLoading(false)
    setIsGeneratingResponse(false)
    
    toast.info("Response stopped")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    // Set cancelled flag to stop any ongoing operations
    isCancelledRef.current = true;
    
    // Clean up any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Reset typing states
    setTypingMessageId(null)
    setTypingContent("")
    setIsGeneratingResponse(false)
    
    // Stop any ongoing speech
    stopSpeech()
    
    // Reset chat state
    const newMessages: Message[] = [{
      id: "1",
      content: "Hello! I'm Finsync AI, your personal financial assistant. I can help you with budgeting, investing, stock analysis, and financial planning. How can I assist you today?",
      role: "assistant",
      timestamp: new Date(),
    }]
    
    // Generate a new timestamp for the chat
    const newChatId = Date.now().toString()
    
    setMessages(newMessages)
    setChatId(newChatId)
    setPromptCount(0)
    setInput("")
    setHasFirstReply(false) // Reset for new chat
    setIsLoading(false) // Reset loading state
    lastSavedMessages.current = newMessages
    isChatLoaded.current = false
    
    // Notify parent component
    if (onNewChat) {
      onNewChat()
    }
  }

  const quickQuestions = [
    "How should I budget my monthly income?",
    "What's the best way to start investing?",
    "How do I build an emergency fund?",
    "Should I invest in stocks or mutual funds?",
    "How can I reduce my expenses?",
  ]

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="h-full flex flex-col">
      {!isConfigured && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Gemini API is not configured. Please add your API key in{" "}
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href="/settings">Settings</a>
            </Button>{" "}
            to use the AI chatbot.
          </AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-col flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {/* Header Section */}
        <div 
          ref={headerRef}
          className={`shrink-0 transition-all duration-300 ${
            isHeaderSticky 
              ? 'sticky top-0 z-10 bg-card border-b shadow-sm' 
              : ''
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span>Finsync AI Assistant</span>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Powered by Gemini
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {promptCount}/{MAX_PROMPTS_PER_CHAT} prompts
                </Badge>
                
                {/* Output mode selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {outputMode === 'text' ? (
                        <MonitorSpeaker className="h-4 w-4" />
                      ) : outputMode === 'voice' ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOutputModeChange('text')}>
                      <MonitorSpeaker className="mr-2 h-4 w-4" />
                      <span>Text Only</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOutputModeChange('both')}>
                      <Volume2 className="mr-2 h-4 w-4" />
                      <span>Text + Voice</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="ghost" size="sm" onClick={handleNewChat}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                {/* Export functionality using the existing ChatExport component */}
                <ChatExport 
                  messages={messages.map(msg => ({
                    ...msg,
                    content: removeMarkdown(msg.content) // Clean markdown for export
                  }))} 
                  chatTitle={selectedChat?.title || "Financial Chat"} 
                />
              </div>
            </CardTitle>
          </CardHeader>
          
          {/* Visual separator line */}
          <div className="border-t border-gray-200 dark:border-gray-800 mx-4"></div>
        </div>
        
        {/* Messages area - takes up available space and scrolls */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const messageDate = new Date(message.timestamp);
                const prevMessageDate = index > 0 ? new Date(messages[index - 1].timestamp) : null;
                
                // Check if we need to show the date separator
                const showDateSeparator = index === 0 || 
                  (prevMessageDate && messageDate.toDateString() !== prevMessageDate.toDateString());
                
                return (
                  <React.Fragment key={message.id}>
                    {showDateSeparator && <DateSeparator date={messageDate} />}
                    <div
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex items-start space-x-2 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : message.isError
                              ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <div className="text-sm">
                            {message.role === "assistant" && typingMessageId === message.id ? (
                              <div className="whitespace-pre-wrap">{typingContent}</div>
                            ) : message.role === "assistant" ? (
                              <MessageRenderer content={message.content} isUser={false} />
                            ) : (
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            )}
                          </div>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTimeInIST(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-3 py-2 bg-muted">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {isGeneratingTitle && (
                <div className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Generating chat title...
                  </div>
                </div>
              )}
              {/* Voice status indicators */}
              {isListening && (
                <div className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full flex items-center">
                    <Mic className="h-3 w-3 mr-1" />
                    🎙️ Listening...
                  </div>
                </div>
              )}
              {isSpeaking && (
                <div className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full flex items-center">
                    <Volume2 className="h-3 w-3 mr-1" />
                    🔊 Speaking...
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0 ml-2" 
                      onClick={stopSpeech}
                    >
                      <VolumeX className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Quick Questions - only shown for new chats */}
        {messages.length === 1 && (
          <div className="p-4 border-t shrink-0">
            <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuestion(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input area - fixed at the bottom */}
        <div className="p-4 border-t shrink-0">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleListening}
              className={`px-3 ${isListening ? 'bg-red-100 text-red-600 border-red-300' : ''}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input || ""}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about budgeting, investing, or financial planning..."
              className="flex-1"
              disabled={!isConfigured || promptCount >= MAX_PROMPTS_PER_CHAT || isGeneratingResponse}
            />
            {isGeneratingResponse ? (
              <Button 
                onClick={handleStopResponse}
                variant="destructive"
                size="sm"
                className="px-3"
                title="Stop response"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={!input || typeof input !== 'string' || !input.trim() || !isConfigured || promptCount >= MAX_PROMPTS_PER_CHAT}
                size="sm"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          {promptCount >= MAX_PROMPTS_PER_CHAT && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You've reached the limit of 10 prompts for this chat.{" "}
              <Button variant="link" className="p-0 h-auto text-xs" onClick={handleNewChat}>
                Start a new chat
              </Button>
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}