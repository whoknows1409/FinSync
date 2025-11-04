"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void
}

const suggestedQuestions = [
  "How can I improve my savings rate?",
  "What's my spending pattern analysis?",
  "Should I invest in stocks or mutual funds?",
  "How much emergency fund do I need?",
  "What are some good budgeting strategies?",
  "How can I reduce my expenses?",
  "What's the best way to track my investments?",
  "Should I pay off debt or invest first?",
  "How do I plan for retirement?",
  "What are tax-saving investment options?",
]

export function SuggestedQuestions({ onSelectQuestion }: SuggestedQuestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Suggested Questions
        </CardTitle>
        <CardDescription>Click on any question to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {suggestedQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start text-left h-auto p-3 whitespace-normal bg-transparent"
              onClick={() => onSelectQuestion(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
