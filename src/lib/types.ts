export type Locale = "ru" | "en" | "pt-BR" | "es";
export type CountryCode = "RU" | "BR";
export type CurrencyCode = "RUB" | "BRL" | "EUR" | "GBP";
/** Money is always stored as a number + currency, never as a formatted string. */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export type CategoryId =
  | "ceramics"
  | "knitting"
  | "sewing"
  | "jewelry"
  | "painting"
  | "woodwork"
  | "embroidery"
  | "pottery"
  | "upcycling"
  | "paper"
  | "other";

export type AuthorStatus = "hobbyist" | "independent" | "pro";
export type Goal = "inspiration" | "skills" | "share" | "sell" | "community";

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatarColor: string;
  bio: string;
  city: string;
  country: string; // ISO code, may be outside supported regions (e.g. ES, GB)
  interests: CategoryId[];
  skills: string[];
  links: { label: string; url: string }[];
  status: AuthorStatus;
  goals: Goal[];
  joinedAt: string;
  contentLang: string; // language the author writes in
  demoRole?: "beginner" | "master" | "buyer";
}

export type PostKind = "finished" | "process" | "tools" | "video" | "tip" | "experiment";

export interface Post {
  id: string;
  authorId: string;
  kind: PostKind;
  title: string;
  body: string;
  category?: CategoryId;
  images: string[];
  createdAt: string;
  lang: string;
  /** Stored human translations (demo). Never auto-generated. */
  translations?: Partial<Record<Locale, { title: string; body: string }>>;
  views: number;
  videoLength?: string;
  technique?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Like {
  userId: string;
  postId: string;
  at: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  at: string;
}

export type FavoriteType = "post" | "tutorial" | "product" | "workshop";
export interface Favorite {
  userId: string;
  type: FavoriteType;
  id: string;
  at: string;
}

export type Availability = "in_stock" | "made_to_order" | "sold_out";
export type ProductStatus = "draft" | "published" | "hidden";
export type SaleType = "ready" | "to_order" | "personalized";
export type ShippingMode = "region" | "fixed" | "free";
export interface ProductShipping {
  mode: ShippingMode;
  /** Seller-defined cost in the product currency (mode = fixed). */
  cost?: number;
  terms?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  price: Money;
  category: CategoryId;
  summary: string;
  description: string;
  story: string;
  materials: string[];
  dimensions: string;
  availability: Availability;
  stock: number;
  makeDays?: number;
  shipsFrom: string;
  shipsTo: string[];
  images: string[];
  createdAt: string;
  lang: string;
  views: number;
  /** Only published products appear in the catalogue; drafts and hidden ones are visible to the seller. */
  status: ProductStatus;
  saleType: SaleType;
  technique?: string;
  specs?: { label: string; value: string }[];
  shipping?: ProductShipping;
  updatedAt?: string;
}

export type Level = "beginner" | "intermediate" | "advanced";

export interface Review {
  authorId: string;
  rating: number;
  text: string;
  at: string;
}

export interface Tutorial {
  id: string;
  authorId: string;
  title: string;
  summary: string;
  cover: string;
  category: CategoryId;
  level: Level;
  durationMin: number;
  price: Money | null;
  materials: string[];
  steps: { title: string; text: string }[];
  reviews: Review[];
  lang: string;
  createdAt: string;
  technique?: string;
  format?: "steps" | "video";
}

export type WorkshopKind = "workshop" | "event";
export type WorkshopStatus = "draft" | "published" | "cancelled";
/** Lifecycle shown to people: "completed" is derived from the end time of a published event. */
export type WorkshopPhase = WorkshopStatus | "completed";

export interface Workshop {
  id: string;
  hostId: string;
  title: string;
  cover: string;
  category: CategoryId;
  startsAt: string;
  durationMin: number;
  timeZone: string;
  format: "online" | "offline";
  country: string;
  city?: string;
  venue?: string;
  price: Money | null;
  seatsTotal: number;
  seatsTaken: number;
  description: string;
  program: string[];
  lang: string;
  kind: WorkshopKind;
  status: WorkshopStatus;
  endsAt: string;
  /** Visible only to enrolled participants and the host. */
  onlineUrl?: string;
  level?: Level | "any";
  materials?: string[];
  terms?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

export interface Enrollment {
  userId: string;
  workshopId: string;
  at: string;
}

export interface TutorialPurchase {
  userId: string;
  tutorialId: string;
  at: string;
  price: Money;
}

export interface CartItem {
  productId: string;
  qty: number;
  priceAtAdd: Money;
  addedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  country: CountryCode;
  fields: Record<string, string>;
  recipient: string;
  phone: string;
  email: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "handed_over"
  | "in_transit"
  | "arrived"
  | "delivered"
  | "received"
  | "cancelled";

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  qty: number;
  unitPrice: Money;
}

export interface Order {
  id: string;
  number: string;
  groupId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  items: OrderItem[];
  deliveryMethod: string; // delivery method id from region config
  address: Omit<Address, "id" | "userId">;
  subtotal: Money;
  shipping: Money;
  total: Money;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  tracking: string; // demo tracking number
  eta?: string;
  reviewed?: boolean;
}

export interface IdeaCard {
  id: string;
  title: string;
  text: string;
  tags?: string[];
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  ideas?: IdeaCard[];
  options?: { label: string; next: string }[];
  at: string;
}

export type AIScenario = "idea" | "develop" | "explore" | "block" | "plan" | "post" | "free" | "project";

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  scenario: AIScenario;
  nodeId: string | null;
  mode: "demo" | "live";
  contextPostId?: string;
  /** Conversation continues a project: the assistant receives the project's context. */
  projectId?: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedIdea {
  id: string;
  userId: string;
  title: string;
  text: string;
  tags: string[];
  conversationId?: string;
  isProject: boolean;
  projectId?: string;
  createdAt: string;
}

export type ProjectStatus = "idea" | "planning" | "in_progress" | "paused" | "done";
export interface ProjectItem {
  id: string;
  text: string;
  done?: boolean;
  at: string;
}
export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  /** The person's original idea, as they phrased it. */
  idea: string;
  cover?: string;
  category?: CategoryId;
  technique?: string;
  recommendations: (ProjectItem & { conversationId?: string })[];
  materials: string[];
  tools: string[];
  plan: ProjectItem[];
  checklist: ProjectItem[];
  notes: ProjectItem[];
  photos: { id: string; src: string; at: string; final: boolean }[];
  conversationId?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  publishedPostId?: string;
  productId?: string;
}

export type NotificationType = "like" | "comment" | "follow" | "order" | "workshop" | "system";
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId?: string;
  key: string; // i18n key in notifications.*
  params?: Record<string, string | number>;
  href?: string;
  at: string;
  read: boolean;
  /** For event updates: old and new raw values; formatted for the reader's locale and time zone. */
  changes?: { field: string; from: string; to: string }[];
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  at: string;
}

export interface Settings {
  lang: Locale;
  country: CountryCode;
  timeZone: string;
  currency: CurrencyCode;
  city: string;
}
