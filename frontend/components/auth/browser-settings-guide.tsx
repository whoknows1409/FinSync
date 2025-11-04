// components/auth/browser-settings-guide.tsx
"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Chrome, Globe } from "lucide-react"

export function BrowserSettingsGuide() {
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('chrome')) {
      return {
        name: 'Google Chrome',
        icon: <Chrome className="h-5 w-5" />,
        steps: [
          'Click the three-dot menu (⋮) in the top-right corner',
          'Select "Settings"',
          'Click "Privacy and security" in the left sidebar',
          'Click "Third-party cookies"',
          'Make sure "Block third-party cookies" is turned off OR',
          'Click "Add" next to "Sites that can always use third-party cookies" and add localhost:3000',
          'Refresh the page and try again'
        ]
      }
    } else if (userAgent.includes('firefox')) {
      return {
        name: 'Mozilla Firefox',
        icon: <Globe className="h-5 w-5" />,
        steps: [
          'Click the three-line menu (≡) in the top-right corner',
          'Select "Settings"',
          'Click "Privacy & Security" in the left sidebar',
          'Under "Cookies and Site Data", click "Manage Exceptions"',
          'Add "localhost" and set it to "Allow"',
          'Refresh the page and try again'
        ]
      }
    } else if (userAgent.includes('safari')) {
      return {
        name: 'Safari',
        icon: <Globe className="h-5 w-5" />,
        steps: [
          'Click "Safari" in the menu bar',
          'Select "Settings"',
          'Click "Privacy"',
          'Uncheck "Prevent cross-site tracking"',
          'Or click "Manage Website Data" and add localhost as an exception',
          'Refresh the page and try again'
        ]
      }
    } else if (userAgent.includes('edge')) {
      return {
        name: 'Microsoft Edge',
        icon: <Globe className="h-5 w-5" />,
        steps: [
          'Click the three-dot menu (⋯) in the top-right corner',
          'Select "Settings"',
          'Click "Privacy, search, and services"',
          'Under "Tracking prevention", make sure it\'s set to "Balanced" OR',
          'Click "Exceptions" and add localhost:3000',
          'Refresh the page and try again'
        ]
      }
    }
    
    return {
      name: 'Your Browser',
      icon: <ArrowRight className="h-5 w-5" />,
      steps: [
        'Look for privacy or security settings in your browser',
        'Find the section for cookies or tracking prevention',
        'Add localhost:3000 as an exception or allow third-party cookies',
        'Refresh the page and try again'
      ]
    }
  }

  const browserInfo = getBrowserInstructions()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {browserInfo.icon}
          <span>{browserInfo.name} Settings</span>
        </CardTitle>
        <CardDescription>
          To enable Google Sign-In, you need to allow third-party cookies for this site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2 text-sm">
          {browserInfo.steps.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full mr-2 mt-0.5 flex-shrink-0">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <Button 
          onClick={() => window.location.reload()} 
          className="w-full"
        >
          I've Updated the Settings
        </Button>
      </CardContent>
    </Card>
  )
}