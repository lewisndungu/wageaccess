import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userProfile, formatDate } from "@/lib/mock-data";
import { AlertCircle, BadgeCheck, Calendar, Edit, Key, Mail, MapPin, Phone, Save, Shield, User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: profile } = useQuery({
    queryKey: ['/api/users/current/profile'],
    initialData: userProfile,
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="flex items-center">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <Button onClick={() => setIsEditing(false)} className="flex items-center">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary to-primary/70"></div>
            <div className="px-6 pb-6 -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={profile.profileImage} alt={profile.name} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 px-2 py-1 rounded-full">
                    <BadgeCheck className="h-3 w-3" />
                    <span className="text-xs capitalize">{profile.role}</span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{profile.position}</p>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{profile.contact}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{profile.address}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Joined {formatDate(profile.joinDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full mr-3">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Password</p>
                    <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Change</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full mr-3">
                    <Key className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Not enabled</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Enable</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-full mr-3">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Login History</p>
                    <p className="text-xs text-muted-foreground">3 devices</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                {isEditing ? "Edit your profile information below" : "Your personal and professional information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="personal">
                <TabsList className="mb-4">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="work">Work Info</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      {isEditing ? (
                        <Input id="fullName" defaultValue={profile.name} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.name}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      {isEditing ? (
                        <Input id="email" type="email" defaultValue={profile.email} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.email}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditing ? (
                        <Input id="phone" defaultValue={profile.contact} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.contact}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergency">Emergency Contact</Label>
                      {isEditing ? (
                        <Input id="emergency" defaultValue={profile.emergencyContact} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.emergencyContact}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Home Address</Label>
                      {isEditing ? (
                        <Input id="address" defaultValue={profile.address} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.address}</div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="work" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      {isEditing ? (
                        <select
                          id="department"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue="2"
                        >
                          <option value="1">IT Department</option>
                          <option value="2">HR</option>
                          <option value="3">Finance</option>
                          <option value="4">Marketing</option>
                          <option value="5">Operations</option>
                        </select>
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">HR</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      {isEditing ? (
                        <Input id="position" defaultValue={profile.position} />
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">{profile.position}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <div className="p-2 border rounded-md bg-muted/40">EMP-00{profile.id}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="joinDate">Join Date</Label>
                      <div className="p-2 border rounded-md bg-muted/40">{formatDate(profile.joinDate)}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="manager">Reports To</Label>
                      {isEditing ? (
                        <select
                          id="manager"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue="1"
                        >
                          <option value="1">John Smith (CEO)</option>
                          <option value="2">Jane Doe (COO)</option>
                        </select>
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">John Smith (CEO)</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">System Role</Label>
                      <div className="p-2 border rounded-md bg-muted/40 capitalize">{profile.role}</div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preferences" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    {isEditing ? (
                      <select
                        id="language"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="en"
                      >
                        <option value="en">English</option>
                        <option value="sw">Swahili</option>
                        <option value="fr">French</option>
                      </select>
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/40">English</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    {isEditing ? (
                      <select
                        id="timezone"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="eet"
                      >
                        <option value="eet">East Africa Time (EAT, UTC+3)</option>
                        <option value="gmt">Greenwich Mean Time (GMT, UTC+0)</option>
                        <option value="est">Eastern Standard Time (EST, UTC-5)</option>
                      </select>
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/40">East Africa Time (EAT, UTC+3)</div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      {isEditing ? (
                        <select
                          id="dateFormat"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue="mdy"
                        >
                          <option value="mdy">MM/DD/YYYY</option>
                          <option value="dmy">DD/MM/YYYY</option>
                          <option value="ymd">YYYY-MM-DD</option>
                        </select>
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">MM/DD/YYYY</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      {isEditing ? (
                        <select
                          id="currency"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue="kes"
                        >
                          <option value="kes">Kenyan Shilling (KES)</option>
                          <option value="usd">US Dollar (USD)</option>
                          <option value="eur">Euro (EUR)</option>
                        </select>
                      ) : (
                        <div className="p-2 border rounded-md bg-muted/40">Kenyan Shilling (KES)</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notifications">Email Notifications</Label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="notify-payroll" className="rounded" defaultChecked />
                          <label htmlFor="notify-payroll" className="text-sm">Payroll updates</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="notify-ewa" className="rounded" defaultChecked />
                          <label htmlFor="notify-ewa" className="text-sm">EWA transactions</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="notify-attendance" className="rounded" defaultChecked />
                          <label htmlFor="notify-attendance" className="text-sm">Attendance reminders</label>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/40">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Payroll updates</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">EWA transactions</span>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Attendance reminders</span>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="border-t flex justify-between">
              {isEditing ? (
                <>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={() => setIsEditing(false)}>Save Changes</Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Define Badge component for JSX compatibility
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
