// frontend/components/chatbot/chat-export.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, Share2, FileText, FileImage, MessageCircle, FileDown, Send, File } from "lucide-react"
import { toast } from "sonner"

interface ChatExportProps {
  messages: any[]
  chatTitle?: string
}

export function ChatExport({ messages, chatTitle = "Financial Chat" }: ChatExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const exportToHTML = async () => {
    if (!messages.length) {
      toast.error("No messages to export")
      return
    }

    setIsExporting(true)
    setOpen(false)
    
    try {
      // Create a simple HTML string for the export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${chatTitle}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background-color: white;
              color: #333;
              line-height: 1.6;
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #3b82f6;
            }
            
            .branding {
              color: #3b82f6;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 10px;
            }
            
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .message {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .message.user {
              text-align: right;
            }
            
            .message.assistant {
              text-align: left;
            }
            
            .message-content {
              display: inline-block;
              padding: 12px 16px;
              border-radius: 8px;
              max-width: 70%;
              text-align: left;
              margin-top: 5px;
            }
            
            .user .message-content {
              background-color: #3b82f6;
              color: white;
            }
            
            .assistant .message-content {
              background-color: #f1f5f9;
              color: #333;
              border: 1px solid #e2e8f0;
            }
            
            .message-role {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .user .message-role {
              color: #3b82f6;
            }
            
            .assistant .message-role {
              color: #666;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #999;
            }
            
            @media print {
              body {
                background-color: white;
                color: #333;
              }
              
              .container {
                max-width: 100%;
                margin: 0;
                padding: 20px;
              }
              
              /* Fix for user messages not showing in PDF */
              .message.user {
                text-align: right !important;
              }
              
              .message.assistant {
                text-align: left !important;
              }
              
              .message-content {
                max-width: 70% !important;
                display: inline-block !important;
              }
              
              .user .message-content {
                background-color: #3b82f6 !important;
                color: white !important;
                border: 1px solid #3b82f6 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .assistant .message-content {
                background-color: #f1f5f9 !important;
                color: #333 !important;
                border: 1px solid #e2e8f0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .message-role {
                color: #666 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="branding">Finsync</div>
              <div class="title">${chatTitle}</div>
            </div>
            
            <div class="messages">
              ${messages.map((message, index) => `
                <div class="message ${message.role}">
                  <div class="message-role">${message.role === 'user' ? 'You' : 'Finsync AI'}</div>
                  <div class="message-content">
                    ${message.content.replace(/\n/g, '<br>')}
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              This chat was exported from Finsync AI
            </div>
          </div>
          
          <script>
            // Auto-print functionality
            window.onload = function() {
              if (window.confirm('Do you want to save this chat as a PDF? Click OK to print and save as PDF.')) {
                window.print();
              }
            };
          </script>
        </body>
        </html>
      `
      
      // Create a blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link to download the HTML file
      const a = document.createElement('a')
      a.href = url
      a.download = `${chatTitle.replace(/\s+/g, '_')}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Chat exported as HTML. When you open the file, you'll be prompted to save as PDF.")
    } catch (error) {
      console.error("Error exporting to HTML:", error)
      toast.error("Failed to export chat")
    } finally {
      setIsExporting(false)
    }
  }

  const exportToText = () => {
    if (!messages.length) {
      toast.error("No messages to export")
      return
    }

    setOpen(false)
    
    try {
      let textContent = `${chatTitle}\n\n`
      textContent += "=" + "=".repeat(chatTitle.length) + "\n\n"
      
      messages.forEach(message => {
        const role = message.role === 'user' ? 'You' : 'Finsync AI'
        textContent += `${role}:\n${message.content}\n\n`
        textContent += "-".repeat(50) + "\n\n"
      })
      
      // Create blob and download
      const blob = new Blob([textContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${chatTitle.replace(/\s+/g, '_')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Chat exported to text file successfully")
    } catch (error) {
      console.error("Error exporting to text:", error)
      toast.error("Failed to export chat to text file")
    }
  }

  const shareViaWhatsApp = () => {
    if (!messages.length) {
      toast.error("No messages to share")
      return
    }

    setOpen(false)
    
    try {
      // Create a summary of the chat with both questions and answers
      let summary = `Check out my financial chat with Finsync AI:\n\n`
      
      // Include all messages (both user and assistant) to match the text export
      // Limit to first 10 messages to avoid character limits
      const messagesToShow = messages.slice(0, 10)
      
      messagesToShow.forEach(message => {
        const role = message.role === 'user' ? 'You' : 'AI'
        summary += `${role}: ${message.content}\n\n`
      })
      
      // Add a note if there are more messages
      if (messages.length > 10) {
        summary += `...and ${messages.length - 10} more messages.\n`
      }
      
      summary += `\nView full chat: ${window.location.href}`
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`
      window.open(whatsappUrl, '_blank')
      
      toast.success("Opening WhatsApp share")
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error)
      toast.error("Failed to share via WhatsApp")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={isExporting}
          className="h-8 flex items-center gap-1"
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <DialogTitle className="text-xl">Export Chat</DialogTitle>
          <DialogDescription>
            Choose how you'd like to export or share your conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-3 py-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto p-0"
              onClick={exportToHTML}
              disabled={isExporting}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg flex-shrink-0">
                  <FileImage className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">Export as HTML</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    Save as a styled HTML file that can be printed to PDF
                  </div>
                </div>
              </div>
            </Button>
          </div>
          
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto p-0"
              onClick={exportToText}
              disabled={isExporting}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">Export as Text</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    Save as a plain text file for easy reading and sharing
                  </div>
                </div>
              </div>
            </Button>
          </div>
          
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto p-0"
              onClick={shareViaWhatsApp}
              disabled={isExporting}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">Share via WhatsApp</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    Share a summary of your chat directly to WhatsApp
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-muted-foreground">
            Your chat contains {messages.length} messages. Exporting will include all messages.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}