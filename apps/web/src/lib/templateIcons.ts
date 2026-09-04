import {
  Activity, AlarmClock, Apple, Armchair, Baby, Backpack, Banknote, Bath, Bed, Bike,
  Binary, Bird, Book, BookOpen, Brain, Briefcase, Brush, Bug, Building2, Cake,
  Calculator, Calendar, Camera, Car, Carrot, Cat, ChefHat, Church, Clapperboard, Clock,
  Cloud, Code, Coffee, Compass, Cpu, CreditCard, Croissant, Crown, Dog, DollarSign,
  Drama, Droplet, Dumbbell, Egg, Feather, Film, Flame, Flower2, Footprints, Gamepad2,
  Gift, GlassWater, Globe, GraduationCap, Guitar, HandHeart, Hammer, Headphones, Heart, HeartPulse,
  House, Hourglass, IceCreamCone, Image, Inbox, Key, Laptop, Leaf, Library, Lightbulb,
  Link, ListChecks, Luggage, Mail, Map, Medal, MessageCircle, Mic, Moon, Mountain,
  Music, Notebook, Package, PaintBucket, Palette, PartyPopper, PawPrint, PenLine, Phone, PiggyBank,
  Pizza, Plane, Trees, Podcast, Presentation, Puzzle, Rocket, Salad, Scale, School,
  Scissors, ScrollText, Send, Shirt, ShoppingBag, ShoppingCart, Shovel, Smile, Snowflake, Sofa,
  Sparkles, Sprout, Star, Stethoscope, Sun, Sunrise, Sunset, Sword, Target, Tent,
  TrendingUp, Trophy, Tv, Umbrella, Utensils, Video, Wallet, WandSparkles, Watch, Waves,
  Wind, Wine, Wrench, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Single source of truth for template icons.
 *
 * TemplateForm (the picker) and TemplateCard (the renderer) both read this, so a
 * new icon can never be selectable but unrenderable — the previous hardcoded
 * lists in each file had already drifted apart.
 *
 * Grouped so a long list stays scannable in the picker.
 */
export const iconGroups: Array<{ label: string; icons: Record<string, LucideIcon> }> = [
  {
    label: "Routine & time",
    icons: { Sunrise, Sun, Sunset, Moon, AlarmClock, Clock, Hourglass, Calendar, Watch, Bed, Bath, Sofa, Armchair }
  },
  {
    label: "Health & fitness",
    icons: { Dumbbell, HeartPulse, Activity, Bike, Footprints, Mountain, Waves, Heart, Stethoscope, Scale, Medal, Trophy, Target }
  },
  {
    label: "Food & drink",
    icons: { Utensils, Coffee, Apple, Carrot, Salad, Pizza, Egg, Croissant, IceCreamCone, Cake, GlassWater, Wine, Droplet, ChefHat }
  },
  {
    label: "Work & study",
    icons: { Briefcase, Laptop, Code, Binary, Cpu, BookOpen, Book, Library, GraduationCap, School, Notebook, PenLine, ScrollText, Presentation, Calculator, ListChecks, Inbox }
  },
  {
    label: "Creative",
    icons: { Palette, Brush, PaintBucket, Music, Guitar, Mic, Headphones, Camera, Image, Film, Clapperboard, Video, Podcast, Drama, Feather, WandSparkles }
  },
  {
    label: "Mind & rest",
    icons: { Brain, Sparkles, Smile, Lightbulb, Puzzle, Compass, Star, Flame, Zap, Leaf, Sprout, Flower2, Trees, Cloud, Snowflake, Wind }
  },
  {
    label: "Home & errands",
    icons: { House, Building2, ShoppingCart, ShoppingBag, Package, Shirt, Scissors, Hammer, Wrench, Shovel, Key, Car, Umbrella, Gift, PartyPopper }
  },
  {
    label: "Money",
    icons: { Wallet, PiggyBank, Banknote, DollarSign, CreditCard, TrendingUp }
  },
  {
    label: "People & places",
    icons: { HandHeart, MessageCircle, Phone, Mail, Send, Link, Globe, Map, Plane, Luggage, Tent, Rocket, Church, Baby, Backpack, Crown, Sword, Dog, Cat, Bird, PawPrint, Bug, Tv, Gamepad2 }
  }
];

/** Flat lookup used when rendering a saved template's icon. */
export const templateIcons: Record<string, LucideIcon> = Object.assign(
  {},
  ...iconGroups.map((group) => group.icons)
);

export const iconNames = Object.keys(templateIcons);

/** Fallback keeps an unknown or legacy icon name from rendering nothing. */
export const resolveIcon = (name: string): LucideIcon => templateIcons[name] ?? Sunrise;
