export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  badge?: string;
  iconName?: string;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  tagline: string;
  url: string;
  ogImage: string;
  links: {
    github?: string;
    docs?: string;
  };
  mainNav: NavItem[];
  appNav: NavItem[];
  mobileNav: NavItem[];
}

export const siteConfig: SiteConfig = {
  name: "LocalFit",
  shortName: "LocalFit",
  description:
    "An Apple-inspired, AI-powered nutrition and fitness platform designed for mindful vitality, daily movement, and holistic well-being.",
  tagline: "Your health, understood better.",
  url: "https://localfit.app",
  ogImage: "/og.png",
  links: {
    docs: "/about",
  },
  mainNav: [
    {
      title: "Features",
      href: "/#features",
    },
    {
      title: "Philosophy",
      href: "/about",
    },
    {
      title: "Food Tracker",
      href: "/app/food",
    },
    {
      title: "Dashboard",
      href: "/app/dashboard",
    },
  ],
  appNav: [
    {
      title: "Dashboard",
      href: "/app/dashboard",
      iconName: "LayoutDashboard",
    },
    {
      title: "Food",
      href: "/app/food",
      iconName: "Utensils",
    },
    {
      title: "Nutrition",
      href: "/app/nutrition",
      iconName: "Apple",
    },
    {
      title: "Activity",
      href: "/app/activity",
      iconName: "Activity",
    },
    {
      title: "Workouts",
      href: "/app/workouts",
      iconName: "Dumbbell",
    },
    {
      title: "Progress",
      href: "/app/progress",
      iconName: "TrendingUp",
    },
    {
      title: "Profile",
      href: "/app/profile",
      iconName: "User",
    },
    {
      title: "Settings",
      href: "/app/settings",
      iconName: "Settings",
    },
  ],
  mobileNav: [
    {
      title: "Dashboard",
      href: "/app/dashboard",
      iconName: "LayoutDashboard",
    },
    {
      title: "Food",
      href: "/app/food",
      iconName: "Utensils",
    },
    {
      title: "Activity",
      href: "/app/activity",
      iconName: "Activity",
    },
    {
      title: "Nutrition",
      href: "/app/nutrition",
      iconName: "Apple",
    },
    {
      title: "Profile",
      href: "/app/profile",
      iconName: "User",
    },
  ],
};
