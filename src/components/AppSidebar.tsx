import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, Timer, Shield, Brain, BarChart3, Lightbulb, Info } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Releases", url: "/releases", icon: Package },
  { title: "Sprints", url: "/sprints", icon: Timer },
  { title: "Quality", url: "/quality", icon: Shield },
  { title: "Predict", url: "/predict", icon: Brain },
  { title: "Model Evaluation", url: "/model-evaluation", icon: BarChart3 },
  { title: "Feature Insights", url: "/feature-insights", icon: Lightbulb },
  { title: "About", url: "/about", icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-6">
        <div className="px-4 mb-8">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse-glow" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground tracking-tight">Release Pulse</h1>
                <p className="text-[10px] text-muted-foreground">Readiness Prediction</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse-glow" />
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
