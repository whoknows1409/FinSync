// frontend/components/chatbot/chat-history.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, Trash2, Bot } from "lucide-react"
import { useState, useEffect } from "react"
import { chatbotAPI } from "@/lib/api-service"
import { useTheme } from "next-themes"
import { formatDateInIST, formatTimeInIST } from "@/lib/date-utils"

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

interface ChatHistoryProps {
  chatHistory?: ChatHistoryItem[]
  onSelectChat: (chat: ChatHistoryItem) => void
  onNewChat: () => void
  currentChatId?: string
}

const MAX_PROMPTS_PER_CHAT = 10

// Helper function to safely parse dates
const safeParseDate = (dateString: string): Date => {
  try {
    // Support numeric timestamps (ms) and ISO strings
    const numeric = typeof dateString === 'string' && /^\d+$/.test(dateString) ? Number(dateString) : NaN;
    const date = !isNaN(numeric) ? new Date(numeric) : new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}`);
      return new Date(); // Return current date as fallback
    }
    return date;
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return new Date(); // Return current date as fallback
  }
};

// Helper function to get the first user message timestamp
const getFirstUserMessageTimestamp = (messages: any[]): string | null => {
  for (const message of messages) {
    if (message.role === 'user') {
      return message.timestamp;
    }
  }
  return null;
};

export function ChatHistory({ 
  chatHistory: propChatHistory, 
  onSelectChat, 
  onNewChat, 
  currentChatId 
}: ChatHistoryProps) {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(propChatHistory || [])
  const [isLoading, setIsLoading] = useState(!propChatHistory)
  const { theme } = useTheme()

  // Load chat history from backend on component mount if not provided as prop
  useEffect(() => {
    if (propChatHistory) {
      setChatHistory(propChatHistory)
      setIsLoading(false)
      return
    }

    const fetchChatHistory = async () => {
      try {
        const response = await chatbotAPI.getChatHistory()
        if (response.success) {
          // Validate dates in the response
          const validatedHistory = response.data.map((chat: any) => {
            // Validate timestamp
            if (chat.timestamp) {
              const timestampDate = safeParseDate(chat.timestamp);
              if (isNaN(timestampDate.getTime())) {
                console.warn(`Invalid timestamp for chat ${chat._id}: ${chat.timestamp}`);
                chat.timestamp = new Date().toISOString();
              }
            } else {
              console.warn(`Missing timestamp for chat ${chat._id}`);
              chat.timestamp = new Date().toISOString();
            }
            
            // Validate createdAt
            if (chat.createdAt) {
              const createdDate = safeParseDate(chat.createdAt);
              if (isNaN(createdDate.getTime())) {
                console.warn(`Invalid createdAt for chat ${chat._id}: ${chat.createdAt}`);
                chat.createdAt = new Date().toISOString();
              }
            } else {
              console.warn(`Missing createdAt for chat ${chat._id}`);
              chat.createdAt = new Date().toISOString();
            }
            
            // Validate message timestamps
            chat.messages = chat.messages.map((msg: any) => {
              if (msg.timestamp) {
                const msgDate = safeParseDate(msg.timestamp);
                if (isNaN(msgDate.getTime())) {
                  console.warn(`Invalid message timestamp for chat ${chat._id}: ${msg.timestamp}`);
                  msg.timestamp = new Date().toISOString();
                }
              } else {
                console.warn(`Missing message timestamp for chat ${chat._id}`);
                msg.timestamp = new Date().toISOString();
              }
              return msg;
            });
            
            return chat;
          });
          
          setChatHistory(validatedHistory)
          console.log('Validated chat history set:', validatedHistory)
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChatHistory()
  }, [propChatHistory])

  // Update chat history when prop changes
  useEffect(() => {
    if (propChatHistory) {
      // Validate dates in the prop
      const validatedHistory = propChatHistory.map((chat: any) => {
        // Validate timestamp
        if (chat.timestamp) {
          const timestampDate = safeParseDate(chat.timestamp);
          if (isNaN(timestampDate.getTime())) {
            console.warn(`Invalid timestamp for chat ${chat._id}: ${chat.timestamp}`);
            chat.timestamp = new Date().toISOString();
          }
        } else {
          console.warn(`Missing timestamp for chat ${chat._id}`);
          chat.timestamp = new Date().toISOString();
        }
        
        // Validate createdAt
        if (chat.createdAt) {
          const createdDate = safeParseDate(chat.createdAt);
          if (isNaN(createdDate.getTime())) {
            console.warn(`Invalid createdAt for chat ${chat._id}: ${chat.createdAt}`);
            chat.createdAt = new Date().toISOString();
          }
        } else {
          console.warn(`Missing createdAt for chat ${chat._id}`);
          chat.createdAt = new Date().toISOString();
        }
        
        // Validate message timestamps
        chat.messages = chat.messages.map((msg: any) => {
          if (msg.timestamp) {
            const msgDate = safeParseDate(msg.timestamp);
            if (isNaN(msgDate.getTime())) {
              console.warn(`Invalid message timestamp for chat ${chat._id}: ${msg.timestamp}`);
              msg.timestamp = new Date().toISOString();
            }
          } else {
            console.warn(`Missing message timestamp for chat ${chat._id}`);
            msg.timestamp = new Date().toISOString();
          }
          return msg;
        });
        
        return chat;
      });
      
      setChatHistory(validatedHistory)
    }
  }, [propChatHistory])

  const handleSelectChat = (chat: ChatHistoryItem) => {
    // Add the timestamp field to ensure compatibility with the chat interface
    const chatWithTimestamp = {
      ...chat,
      id: chat.timestamp || chat._id // Use timestamp as id for compatibility
    }
    onSelectChat(chatWithTimestamp)
  }

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('Deleting chat with id:', id)
    try {
      await chatbotAPI.deleteChatHistory(id)
      setChatHistory(prev => prev.filter(chat => {
        // Match by either _id (ObjectId) or timestamp field
        return chat._id !== id && chat.timestamp !== id
      }))
      
      // If we're deleting the current chat, start a new one
      if (id === currentChatId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const handleClearHistory = async () => {
    try {
      await chatbotAPI.clearChatHistory()
      setChatHistory([])
      onNewChat()
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  const formatDate = (chat: ChatHistoryItem) => {
    try {
      // Get the first user message timestamp
      const firstUserMessageTimestamp = getFirstUserMessageTimestamp(chat.messages);
      const dateString = firstUserMessageTimestamp || chat.timestamp || chat.createdAt;
      const date = safeParseDate(dateString);
      return formatDateInIST(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  }

  const formatTime = (chat: ChatHistoryItem) => {
    try {
      // Get the first user message timestamp
      const firstUserMessageTimestamp = getFirstUserMessageTimestamp(chat.messages);
      const timestamp = firstUserMessageTimestamp || chat.timestamp || chat.createdAt;
      const date = safeParseDate(timestamp);
      return formatTimeInIST(date);
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p>Loading chat history...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Chat History
            </CardTitle>
            <CardDescription>Your recent conversations</CardDescription>
          </div>
          <Button size="sm" onClick={onNewChat}>
            New Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        {chatHistory.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No chat history yet</p>
          </div>
        ) : (
          <>
            {chatHistory.map((chat) => (
              <div
                key={chat._id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  currentChatId === (chat.timestamp || chat._id) 
                    ? theme === 'dark' 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-blue-500 bg-blue-50'
                    : ''
                }`}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{chat.title}</h4>
                      {chat.promptCount >= MAX_PROMPTS_PER_CHAT && (
                        <Badge variant="secondary" className="text-xs">Full</Badge>
                      )}
                      {chat.promptCount < MAX_PROMPTS_PER_CHAT && (
                        <Badge variant="outline" className="text-xs">
                          {chat.promptCount}/{MAX_PROMPTS_PER_CHAT}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(chat)} at {formatTime(chat)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 ml-1 flex-shrink-0"
                    onClick={(e) => handleDeleteChat(chat.timestamp || chat._id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2" 
              onClick={handleClearHistory}
            >
              Clear All History
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}