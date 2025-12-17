import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mock-api";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, ExternalLink } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  
  const { data: users, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.searchUsers(query),
  });

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-heading mb-4">Discover Creators</h1>
          <p className="text-muted-foreground mb-8">Find people, inspiration, and connections.</p>
          
          <div className="relative max-w-lg mx-auto">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              className="pl-10 h-12 rounded-full shadow-sm" 
              placeholder="Search by username or name..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Searching...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users?.map((user) => (
              <Link key={user.id} href={`/${user.username}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full overflow-hidden border-border/60">
                  <CardContent className="p-0">
                    <div className="h-24 bg-gradient-to-r from-primary/10 to-purple-400/10 group-hover:from-primary/20 group-hover:to-purple-400/20 transition-colors" />
                    <div className="px-6 pb-6 -mt-10">
                      <Avatar className="w-20 h-20 border-4 border-background shadow-sm mb-3">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {user.displayName}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5em]">
                        {user.bio || "No bio available."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {users?.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No users found matching "{query}"
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
