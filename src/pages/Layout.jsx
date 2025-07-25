

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Shield, 
  Command, 
  Settings, 
  MessageSquare, 
  Database,
  Eye,
  LogOut,
  LayoutGrid,
  AlertTriangle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";

const navigationItems = [
  {
    title: "Command Center",
    url: createPageUrl("CommandCenter"),
    icon: Command,
    adminOnly: false,
  },
  {
    title: "The Forge",
    url: createPageUrl("Forge"),
    icon: Shield,
    adminOnly: false,
  },
  {
    title: "Instruction Matrix",
    url: createPageUrl("InstructionMatrix"),
    icon: Database,
    adminOnly: false,
  },
  {
    title: "Projects",
    url: createPageUrl("Projects"),
    icon: LayoutGrid,
    adminOnly: false,
  },
  {
    title: "Chat Interface",
    url: createPageUrl("ChatInterface"),
    icon: MessageSquare,
    adminOnly: false,
  },
  {
    title: "Admin Panel",
    url: createPageUrl("AdminPanel"),
    icon: Settings,
    adminOnly: true, // This link is now restricted
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false); // New state for paused status

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        // An admin role or architect access level grants admin privileges
        setIsAdmin(currentUser?.role === 'admin' || currentUser?.access_level === 'architect');
        // Correctly set the paused state based on the user's status.
        setIsPaused(currentUser?.status === 'paused');
      } catch (error) {
        setUser(null);
        setIsAdmin(false);
        setIsPaused(false); // Ensure isPaused is false if user is not logged in
      }
    };
    loadUser();
  }, [location.pathname]); // Rerun on page navigation to ensure status is fresh

  const handleLogout = async () => {
    await User.logout();
    window.location.reload(); // Force reload to ensure state is cleared
  };

  // Renders a minimal layout for the public-facing chat interface
  if (currentPageName === "PublicChat") {
    return (
      <div className="bg-[#0D1421] min-h-screen">
        {children}
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="p-6 bg-[#0D1421] min-h-screen text-[#E2E8F0] flex items-center justify-center">
        <Card className="bg-[#0A0F1A] border-[#FF8C00] shadow-xl max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-[#FF8C00] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#E2E8F0] mb-2">ACCOUNT PAUSED</h2>
            <p className="text-[#94A3B8] mb-6">Your access to the Ark has been temporarily suspended. Please contact the Architect.</p>
            <Button
                variant="outline"
                onClick={handleLogout}
                className="border-[#1A2332] text-[#E2E8F0] hover:bg-[#1A2332] hover:text-[#00D4FF]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renders the full command center layout for authenticated users
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0D1421]">
        <style>{`
          :root {
            --ark-dark: #0D1421;
            --ark-darker: #0A0F1A;
            --ark-cyan: #00D4FF;
            --ark-cyan-glow: rgba(0, 212, 255, 0.2);
            --ark-gray: #1A2332;
            --ark-text: #E2E8F0;
            --ark-text-muted: #94A3B8;
          }
        `}</style>
        
        <Sidebar className="border-r border-[#1A2332] bg-[#0A0F1A]">
          <SidebarHeader className="border-b border-[#1A2332] p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-lg flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
                <Shield className="w-6 h-6 text-[#0D1421] font-bold" />
              </div>
              <div>
                <h2 className="font-bold text-[#E2E8F0] text-lg tracking-wide">SENTINEL ARK</h2>
                <p className="text-xs text-[#94A3B8] font-medium">DYNAMICS PROTOCOL</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 bg-[#0A0F1A]">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest px-3 py-3">
                TACTICAL OPERATIONS
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems
                    .filter(item => !item.adminOnly || isAdmin) // Filter out admin-only links if not admin
                    .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-[#1A2332] hover:text-[#00D4FF] transition-all duration-300 rounded-lg mb-1 border border-transparent hover:border-[#00D4FF]/20 ${
                          location.pathname === item.url ? 'bg-[#1A2332] text-[#00D4FF] border-[#00D4FF]/30 shadow-lg shadow-[#00D4FF]/10' : 'text-[#E2E8F0]'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium tracking-wide">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest px-3 py-3">
                SYSTEM STATUS
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse"></div>
                      <span className="text-[#E2E8F0]">System Status</span>
                    </div>
                    <span className="text-[#00FF88] font-bold">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#94A3B8]">Active SIs</span>
                    <span className="text-[#00D4FF] font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#94A3B8]">Clearance</span>
                    <span className="text-[#FFD700] font-bold">{user?.access_level?.toUpperCase() || 'LOADING'}</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-[#1A2332] p-4 bg-[#0A0F1A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-full flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[#0D1421]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#E2E8F0] text-sm truncate">
                    {user?.full_name || 'OPERATOR'}
                  </p>
                  <p className="text-xs text-[#94A3B8] truncate">
                    {user?.access_level?.toUpperCase() || 'CLEARANCE PENDING'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-[#94A3B8] hover:text-[#00D4FF] hover:bg-[#1A2332] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-[#0D1421]">
          <header className="bg-[#0A0F1A] border-b border-[#1A2332] px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-[#1A2332] p-2 rounded-lg transition-colors text-[#E2E8F0]" />
              <h1 className="text-xl font-bold text-[#E2E8F0] tracking-wide">SENTINEL ARK</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

