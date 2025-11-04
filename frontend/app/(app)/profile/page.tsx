"use client"

import { useState, useEffect, useRef } from "react"
import "@/styles/cropper.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface UserStats {
  totalTransactions: number
  activeGoals: number
  activeBudgets: number
  portfolioValue: string
  memberSince: string
}

interface Activity {
  action: string
  time: string
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { profileAPI } from "@/lib/api-service"
import { User, Mail, Calendar, TrendingUp, Target, Wallet, Upload, Edit3, Loader2, ZoomIn, Crop, PiggyBank } from "lucide-react"
import { toast } from "sonner"
import Cropper, { Area } from 'react-easy-crop'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  })

  // Image cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to refresh data
  const refreshData = async () => {
    try {
      setIsRefreshing(true)
      
      // Fetch user stats
      const statsResponse = await profileAPI.getStats()
      setStats(statsResponse.data)
      
      // Fetch user activities
      const activitiesResponse = await profileAPI.getActivities()
      setActivities(activitiesResponse.data)
    } catch (error) {
      console.error('Failed to refresh profile data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch user stats
        const statsResponse = await profileAPI.getStats()
        setStats(statsResponse.data)
        
        // Fetch user activities
        const activitiesResponse = await profileAPI.getActivities()
        setActivities(activitiesResponse.data)
      } catch (error) {
        console.error('Failed to fetch profile data:', error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Update formData when user changes
  useEffect(() => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    })
  }, [user])

  const handleSave = async () => {
    try {
      // Only include fields that have changed
      const updatedData: any = {};
      if (formData.name !== user?.name) updatedData.name = formData.name;
      if (formData.email !== user?.email) updatedData.email = formData.email;
      if (formData.phone !== user?.phone) updatedData.phone = formData.phone;
      if (formData.bio !== user?.bio) updatedData.bio = formData.bio;
      
      // Only call updateUser if there are changes
      if (Object.keys(updatedData).length > 0) {
        await updateUser(updatedData);
        
        // Update formData with the new values
        setFormData(prev => ({
          ...prev,
          ...updatedData
        }));
        
        setIsEditing(false);
        toast.success("Profile updated successfully");
        
        // Refresh data after successful update
        await refreshData();
      } else {
        setIsEditing(false);
        toast.info("No changes were made");
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile: ' + (error.message || 'Unknown error'))
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    })
    setIsEditing(false)
  }

  // Handle file selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // Check file size (mobile cameras can produce large images)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("Image is too large. Please use an image under 10MB.");
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please use a JPEG, PNG, GIF, or WebP image.");
        return;
      }
      
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string)
        setCropModalOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  // Crop complete handler
  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  // Create cropped image
  const createCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      const image = new Image()
      image.src = imageSrc
      
      await new Promise((resolve) => {
        image.onload = resolve
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      
      // Set canvas dimensions to the cropped area
      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height
      
      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      )
      
      // Convert to blob
      return new Promise<File>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'))
              return
            }
            
            // Convert blob to file
            const file = new File([blob], 'profile-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            
            resolve(file)
          },
          'image/jpeg',
          0.9 // 90% quality
        )
      })
    } catch (error) {
      console.error('Error creating cropped image:', error)
      throw error
    }
  }

  // Handle crop and upload
  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels) return

    try {
      setIsUploading(true)
      
      // Create cropped image
      const croppedFile = await createCroppedImage()
      
      // Upload the cropped image
      const response = await profileAPI.uploadProfileImage(croppedFile)
      await updateUser({ profileImage: response.data.profileImage })
      
      // Close crop modal
      setCropModalOpen(false)
      setImageSrc(null)
      
      toast.success("Profile image updated successfully")
      
      // Refresh data after successful image update
      await refreshData()
    } catch (error: any) {
      console.error('Failed to upload cropped image:', error)
      toast.error('Failed to upload profile image: ' + (error.message || 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }

  // Handle profile image upload (legacy method without cropping)
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Check network connection
    if (!navigator.onLine) {
      toast.error("You're offline. Please check your internet connection.")
      return
    }

    const file = event.target.files?.[0]
    if (file) {
      // For mobile, we'll use the cropping method
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string)
        setCropModalOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const statsData = stats ? [
    { label: "Total Transactions", value: stats.totalTransactions.toString(), icon: TrendingUp },
    { label: "Active Budgets", value: stats.activeBudgets.toString(), icon: PiggyBank },
    { label: "Portfolio Value", value: stats.portfolioValue, icon: Wallet },
    { label: "Member Since", value: stats.memberSince, icon: Calendar },
  ] : [
    { label: "Total Transactions", value: "0", icon: TrendingUp },
    { label: "Active Budgets", value: "0", icon: PiggyBank },
    { label: "Portfolio Value", value: "₹0", icon: Wallet },
    { label: "Member Since", value: "Jan 2024", icon: Calendar },
  ]

  return (
    <>
      {/* Mobile loading overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 md:hidden">
          <div className="bg-white p-4 rounded-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p>Uploading image...</p>
          </div>
        </div>
      )}
      
      {/* Image Cropping Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-80 w-full bg-muted rounded-md overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // Square aspect ratio for profile images
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Zoom:</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm w-10">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setCropModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCropAndUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    'Crop & Upload'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and preferences</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="md:hidden"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                      <DialogTrigger asChild>
                        <div className="relative group cursor-pointer">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={user?.profileImage} />
                            <AvatarFallback className="text-2xl">
                              {user?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <div className="flex justify-between items-center mb-4">
                          <DialogTitle>Profile Picture</DialogTitle>
                          <DialogClose asChild>
                            <Button variant="ghost" size="icon">
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </DialogClose>
                        </div>
                        <div className="flex justify-center">
                          {user?.profileImage ? (
                            <img 
                              src={user.profileImage} 
                              alt="Profile" 
                              className="max-h-[80vh] max-w-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-64 w-64 rounded-full bg-muted">
                              <span className="text-4xl font-semibold">
                                {user?.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {isEditing && (
                      <>
                        <Label htmlFor="profile-image" className="absolute -bottom-2 -right-2 cursor-pointer">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                        </Label>
                        <Input
                          ref={fileInputRef}
                          id="profile-image"
                          type="file"
                          accept="image/*;capture=camera" // This hints to mobile to use the camera
                          className="hidden"
                          onChange={onFileChange}
                          disabled={isUploading}
                        />
                        {/* Add a camera button for mobile */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 md:hidden"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.click()
                            }
                          }}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Take Photo
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{user?.name}</h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {user?.membershipType || 'Basic'} Member
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="text-sm font-medium">{stats?.memberSince || 'Jan 2024'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Active</span>
                    <span className="text-sm font-medium">Today</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account Status</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
                {isEditing && (
                  <div className="flex space-x-2 pt-4">
                    <Button onClick={handleSave}>Save Changes</Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
                <CardDescription>Your financial activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {statsData.map((stat, index) => (
                    <div key={index} className="text-center p-4 rounded-lg bg-muted/50">
                      <stat.icon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest financial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.length > 0 ? activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                        <span className="text-sm">{activity.action}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activities
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}