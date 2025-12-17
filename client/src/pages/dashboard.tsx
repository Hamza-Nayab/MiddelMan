import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { api, Link as LinkType } from "@/lib/mock-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Trash2, Eye, EyeOff, ExternalLink, Star, BarChart3, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const LinkFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
});

// Mock Analytics Data Generator
const generateAnalyticsData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map(day => ({
        name: day,
        visits: Math.floor(Math.random() * 500) + 100,
        clicks: Math.floor(Math.random() * 300) + 50,
    }));
};

const PIE_DATA = [
    { name: '5 Stars', value: 65, color: '#8b5cf6' },
    { name: '4 Stars', value: 25, color: '#a78bfa' },
    { name: '3 Stars', value: 5, color: '#c4b5fd' },
    { name: '2 Stars', value: 3, color: '#ddd6fe' },
    { name: '1 Star', value: 2, color: '#ede9fe' },
];

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [analyticsData] = useState(() => generateAnalyticsData()); // Stable random data per session

  // Auth Check
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  if (!isUserLoading && !user) {
    setLocation("/auth");
    return null;
  }

  // Data Fetching
  const { data: links, isLoading: isLinksLoading } = useQuery({
    queryKey: ["links", user?.id],
    queryFn: () => user ? api.getLinks(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: reviews, isLoading: isReviewsLoading } = useQuery({
    queryKey: ["reviews-owner", user?.id],
    queryFn: () => user ? api.getAllReviewsForOwner(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  // Mutations
  const addLinkMutation = useMutation({
    mutationFn: (values: z.infer<typeof LinkFormSchema>) => api.addLink({ 
      ...values, 
      userId: user!.id, 
      order: links ? links.length : 0,
      isVisible: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setIsAddLinkOpen(false);
      toast({ title: "Link Added", description: "Your new link is live." });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: api.deleteLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      toast({ title: "Link Deleted", description: "Link has been removed." });
    },
  });
  
  const toggleReviewVisibilityMutation = useMutation({
    mutationFn: api.toggleReviewVisibility,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reviews-owner"] });
    }
  });

  const updateThemeMutation = useMutation({
      mutationFn: (theme: "light" | "dark" | "gradient") => api.updateUserTheme(user!.id, theme),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          toast({ title: "Theme Updated", description: "Your profile look has been updated." });
      }
  });

  const form = useForm<z.infer<typeof LinkFormSchema>>({
    resolver: zodResolver(LinkFormSchema),
    defaultValues: { title: "", url: "" },
  });

  const onSubmit = (values: z.infer<typeof LinkFormSchema>) => {
    addLinkMutation.mutate(values);
  };

  if (isUserLoading || !user) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Main Content Area */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {user.displayName}.</p>
              </div>
              <Link href={`/${user.username}`} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                  View Profile <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            <Tabs defaultValue="links" className="w-full">
              <TabsList className="grid grid-cols-4 w-full md:w-[500px]">
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="appearance">Design</TabsTrigger>
              </TabsList>
              
              <TabsContent value="links" className="space-y-4 mt-6">
                <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-12 border-dashed border-2 bg-transparent text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 shadow-none">
                      <Plus className="mr-2 h-4 w-4" /> Add New Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Link</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl><Input placeholder="My Portfolio" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL</FormLabel>
                              <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={addLinkMutation.isPending}>
                            {addLinkMutation.isPending ? "Adding..." : "Add Link"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <div className="space-y-3">
                  {isLinksLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading links...</div>
                  ) : links?.length === 0 ? (
                    <div className="text-center py-10 border rounded-xl border-dashed">
                      <p className="text-muted-foreground">No links yet. Add your first one above!</p>
                    </div>
                  ) : (
                    links?.map((link) => (
                      <Card key={link.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="cursor-move text-muted-foreground/50 hover:text-muted-foreground">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{link.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Switch checked={link.isVisible} onCheckedChange={() => {}} />
                             <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteLinkMutation.mutate(link.id)}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="mt-6">
                <div className="grid gap-4">
                   {isReviewsLoading ? <p>Loading...</p> : reviews?.map(review => (
                       <Card key={review.id} className={cn("transition-opacity", review.isHidden && "opacity-50 bg-muted/50")}>
                           <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                               <div className="flex items-center gap-2">
                                   <div className="font-bold">{review.authorName}</div>
                                   <div className="flex items-center text-yellow-500">
                                       {Array.from({length: review.rating}).map((_, i) => (
                                           <Star key={i} className="w-3 h-3 fill-current" />
                                       ))}
                                   </div>
                               </div>
                               <div className="text-xs text-muted-foreground">
                                   {new Date(review.createdAt).toLocaleDateString()}
                               </div>
                           </CardHeader>
                           <CardContent className="p-4 pt-2">
                               <p className="text-sm mb-3">{review.comment}</p>
                               <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleReviewVisibilityMutation.mutate(review.id)}
                                className="h-7 text-xs"
                               >
                                   {review.isHidden ? <><Eye className="w-3 h-3 mr-2"/> Show Publicly</> : <><EyeOff className="w-3 h-3 mr-2"/> Hide Review</>}
                               </Button>
                           </CardContent>
                       </Card>
                   ))}
                   {reviews?.length === 0 && <p className="text-center text-muted-foreground py-10">No reviews yet.</p>}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Profile Visits & Clicks</CardTitle>
                            <CardDescription>Last 7 days performance</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData}>
                                    <defs>
                                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="visits" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVisits)" />
                                    <Area type="monotone" dataKey="clicks" stroke="#10b981" fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Review Distribution</CardTitle>
                            <CardDescription>Breakdown of star ratings</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={PIE_DATA}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {PIE_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="appearance">
                <Card>
                    <CardHeader>
                        <CardTitle>Theme Selection</CardTitle>
                        <CardDescription>Choose how your public profile looks to visitors.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-6">
                            <button 
                                onClick={() => updateThemeMutation.mutate("light")}
                                className={cn("group relative aspect-[9/16] rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105", user.theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
                            >
                                <div className="absolute inset-0 bg-white">
                                    <div className="h-1/3 bg-slate-100 p-4 flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="h-8 rounded-lg bg-slate-100 border border-slate-200"></div>
                                        <div className="h-8 rounded-lg bg-slate-100 border border-slate-200"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-white/90 backdrop-blur-sm border-t">
                                    <span className="font-semibold text-sm">Light</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => updateThemeMutation.mutate("dark")}
                                className={cn("group relative aspect-[9/16] rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105", user.theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
                            >
                                <div className="absolute inset-0 bg-slate-950">
                                    <div className="h-1/3 bg-slate-900 p-4 flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-800"></div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="h-8 rounded-lg bg-slate-900 border border-slate-800"></div>
                                        <div className="h-8 rounded-lg bg-slate-900 border border-slate-800"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-slate-950/90 backdrop-blur-sm border-t border-white/10">
                                    <span className="font-semibold text-sm text-white">Dark</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => updateThemeMutation.mutate("gradient")}
                                className={cn("group relative aspect-[9/16] rounded-xl border-2 transition-all overflow-hidden text-left hover:scale-105", user.theme === 'gradient' ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                                    <div className="h-1/3 p-4 flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md"></div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30"></div>
                                        <div className="h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30"></div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-black/20 backdrop-blur-sm border-t border-white/10">
                                    <span className="font-semibold text-sm text-white">Gradient</span>
                                </div>
                            </button>
                        </div>
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Phone */}
          <div className="hidden lg:block w-[380px] shrink-0">
             <div className="sticky top-24">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Live Preview</h3>
                </div>
                <div className="border-[12px] border-slate-900 rounded-[3rem] h-[750px] overflow-hidden bg-background shadow-2xl relative">
                     {/* Notch */}
                     <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-xl w-40 mx-auto z-20"></div>
                     <iframe 
                        src={`/${user.username}?preview=true`} 
                        className="w-full h-full border-none bg-white"
                        title="Preview"
                        key={user.theme} // Force reload on theme change
                     />
                </div>
             </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
