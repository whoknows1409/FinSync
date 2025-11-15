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
import jsPDF from 'jspdf'

interface ChatExportProps {
  messages: any[]
  chatTitle?: string
}

export function ChatExport({ messages, chatTitle = "Financial Chat" }: ChatExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const exportToPDF = async () => {
    if (!messages.length) {
      toast.error("No messages to export")
      return
    }

    setIsExporting(true)
    setOpen(false)
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let yPosition = margin

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
          return true
        }
        return false
      }

      // Helper function to wrap text
      const wrapText = (text: string, maxWidth: number, fontSize: number) => {
        pdf.setFontSize(fontSize)
        const lines = pdf.splitTextToSize(text, maxWidth)
        return lines
      }

      // Helper function to parse and render markdown-like content
      const renderFormattedText = (text: string, x: number, maxWidth: number, isUser: boolean) => {
        const lines = text.split('\n')
        let currentY = yPosition
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          
          // Check for headers
          if (line.match(/^#{1,3}\s+/)) {
            checkPageBreak(15)
            const headerText = line.replace(/^#{1,3}\s+/, '')
            const level = (line.match(/^(#{1,3})/)?.[0].length || 1)
            const fontSize = level === 1 ? 16 : level === 2 ? 14 : 12
            
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(fontSize)
            pdf.setTextColor(40, 40, 40)
            const headerLines = wrapText(headerText, maxWidth, fontSize)
            headerLines.forEach((headerLine: string) => {
              pdf.text(headerLine, x, currentY)
              currentY += fontSize * 0.5
            })
            currentY += 3
            
            // Add underline for H1
            if (level === 1) {
              pdf.setDrawColor(200, 200, 200)
              pdf.line(x, currentY, x + maxWidth, currentY)
              currentY += 3
            }
            
            pdf.setFont('helvetica', 'normal')
            continue
          }
          
          // Check for lists
          if (line.match(/^[\*\-]\s+/) || line.match(/^\d+\.\s+/)) {
            checkPageBreak(10)
            const listText = line.replace(/^[\*\-]\s+/, '• ').replace(/^\d+\.\s+/, (match) => match)
            pdf.setFontSize(10)
            pdf.setTextColor(60, 60, 60)
            const listLines = wrapText(listText, maxWidth - 5, 10)
            listLines.forEach((listLine: string) => {
              pdf.text(listLine, x + 5, currentY)
              currentY += 5
            })
            continue
          }
          
          // Check for table rows
          if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            // Skip separator rows
            if (line.match(/^\|[\s\-:]+\|$/)) continue
            
            checkPageBreak(10)
            const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
            const cellWidth = maxWidth / cells.length
            
            pdf.setFontSize(9)
            pdf.setTextColor(40, 40, 40)
            
            cells.forEach((cell, index) => {
              const cellX = x + (index * cellWidth)
              pdf.text(cell.substring(0, 30), cellX + 2, currentY)
            })
            
            // Draw table borders
            pdf.setDrawColor(200, 200, 200)
            pdf.rect(x, currentY - 4, maxWidth, 6)
            currentY += 8
            continue
          }
          
          // Check for horizontal rules
          if (line.match(/^-{3,}$/)) {
            checkPageBreak(5)
            pdf.setDrawColor(200, 200, 200)
            pdf.line(x, currentY, x + maxWidth, currentY)
            currentY += 5
            continue
          }
          
          // Regular paragraphs
          if (line.trim() !== '') {
            checkPageBreak(10)
            
            // Handle inline formatting
            let processedText = line
            // Remove markdown bold/italic markers for PDF
            processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '$1')
            processedText = processedText.replace(/\*([^*]+)\*/g, '$1')
            processedText = processedText.replace(/`([^`]+)`/g, '$1')
            
            pdf.setFontSize(10)
            pdf.setTextColor(60, 60, 60)
            const textLines = wrapText(processedText, maxWidth, 10)
            textLines.forEach((textLine: string) => {
              pdf.text(textLine, x, currentY)
              currentY += 5
            })
            currentY += 2
          } else {
            currentY += 3
          }
        }
        
        yPosition = currentY
      }

      // Header
      pdf.setFillColor(59, 130, 246) // Blue
      pdf.rect(0, 0, pageWidth, 25, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.text('Finsync', pageWidth / 2, 12, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(chatTitle, pageWidth / 2, 19, { align: 'center' })
      
      yPosition = 35

      // Messages
      messages.forEach((message, index) => {
        const isUser = message.role === 'user'
        
        // Check if we need a new page
        checkPageBreak(20)
        
        // Message role label
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(isUser ? 59 : 100, isUser ? 130 : 100, isUser ? 246 : 100)
        pdf.text(isUser ? 'You' : 'Finsync AI', margin, yPosition)
        yPosition += 6
        
        // Message content box
        const boxX = isUser ? margin + 30 : margin
        const boxWidth = isUser ? contentWidth - 30 : contentWidth - 30
        
        // Save position before content
        const contentStartY = yPosition
        
        // Render formatted content
        pdf.setTextColor(40, 40, 40)
        pdf.setFont('helvetica', 'normal')
        renderFormattedText(message.content, boxX, boxWidth, isUser)
        
        // Draw box around message (after we know the height)
        const boxHeight = yPosition - contentStartY + 3
        pdf.setDrawColor(isUser ? 59 : 220, isUser ? 130 : 220, isUser ? 246 : 220)
        pdf.setFillColor(isUser ? 240 : 249, isUser ? 248 : 250, isUser ? 255 : 251)
        pdf.roundedRect(boxX - 3, contentStartY - 4, boxWidth + 6, boxHeight, 2, 2, 'FD')
        
        // Re-render content on top of box
        yPosition = contentStartY
        renderFormattedText(message.content, boxX, boxWidth, isUser)
        
        yPosition += 8
      })

      // Footer
      const footerY = pageHeight - 10
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Exported from Finsync AI - ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' })

      // Save PDF
      pdf.save(`${chatTitle.replace(/\s+/g, '_')}.pdf`)
      toast.success("Chat exported to PDF successfully")
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      toast.error("Failed to export chat to PDF")
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
              onClick={exportToPDF}
              disabled={isExporting}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg shrink-0">
                  <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">Export as PDF</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    Download a formatted PDF with your entire conversation
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
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg shrink-0">
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
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg shrink-0">
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