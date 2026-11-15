"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

const MIN_PASSWORD_LENGTH = 8

// Calls an account endpoint with the signed-in user's token
async function accountRequest(path: string, method: "POST" | "DELETE", body?: object) {
  const token = localStorage.getItem("token")
  const response = await fetch(`/api/auth/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.")
  }
  return data
}

interface AccountProps {
  // Accounts that sign in with Google have no password
  isGoogleAccount: boolean
}

export function SecurityCard({ isGoogleAccount }: AccountProps) {
  const { logout } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    }
    if (newPassword !== confirmPassword) {
      return setError("The two new passwords do not match")
    }

    setSaving(true)
    try {
      const data = await accountRequest("change-password", "POST", { currentPassword, newPassword })
      // Tokens issued before the change no longer work; keep this device signed in with the new one
      if (data.token) localStorage.setItem("token", data.token)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success(data.message || "Password changed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password")
    } finally {
      setSaving(false)
    }
  }

  const handleSignOutEverywhere = async () => {
    if (!confirm("Sign out of FinSync on every device, including this one?")) return
    setSigningOut(true)
    try {
      await accountRequest("logout-all", "POST")
      logout()
      router.push("/")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you out")
      setSigningOut(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Security</span>
        </CardTitle>
        <CardDescription>Password and signed-in devices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGoogleAccount ? (
          <p className="text-sm text-muted-foreground">
            You sign in with Google, so there is no FinSync password to change. Manage your password in your Google account.
          </p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" variant="outline" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </form>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Sign out everywhere</Label>
            <p className="text-sm text-muted-foreground">
              Ends every session on every device. Use this if you signed in on a device you no longer have.
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOutEverywhere} disabled={signingOut} className="shrink-0">
            {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function DeleteAccountButton({ isGoogleAccount }: AccountProps) {
  const { logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)

  const close = () => {
    if (deleting) return
    setOpen(false)
    setConfirmation("")
    setError("")
  }

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setDeleting(true)
    try {
      await accountRequest(
        "account",
        "DELETE",
        isGoogleAccount ? { confirm: confirmation.trim() } : { password: confirmation }
      )
      toast.success("Your account has been deleted")
      logout()
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account")
      setDeleting(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete</Button>

      <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && close()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account with all of its transactions, budgets, goals, chat history and
              paper trading portfolio. It cannot be undone. Export your data first if you want a copy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDelete} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                {isGoogleAccount ? "Type DELETE to confirm" : "Enter your password to confirm"}
              </Label>
              <Input
                id="delete-confirmation"
                type={isGoogleAccount ? "text" : "password"}
                autoComplete={isGoogleAccount ? "off" : "current-password"}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={deleting}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={deleting || !confirmation}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete my account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
