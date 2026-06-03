// ============================================================
//  ICON SET SWAP POINT — Liquid product glyphs
// ------------------------------------------------------------
//  Lucide is a substitution for the real Liquid icon set, which was
//  masked in the Figma export (handoff README §Caveats / Iconography:
//  stroke 2, round joins, currentColor). Every product component pulls
//  its glyphs from THIS file, so swapping the icon set is a single-file
//  change: re-point the re-exports below at the official package, or
//  replace individual names with custom SVG components of the same name.
//
//  Note: shadcn/ui primitives (dialog, select, sheet, dropdown, checkbox,
//  accordion, sonner) keep their own direct lucide imports — those are
//  structural control affordances, not brand glyphs.
//
//  Default stroke width lives in `brand.icons.strokeWidth` (lib/brand.ts).
// ============================================================

export {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Code2,
  Columns3,
  Copy,
  CreditCard,
  Database,
  Gem,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  MapPin,
  PencilLine,
  Plane,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Sunset,
  Target,
  TrendingUp,
  Trash2,
  TriangleAlert,
  Umbrella,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
