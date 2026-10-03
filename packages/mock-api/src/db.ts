import type { PrefType } from './engine/preferences';

/** Internal tables of the stub backend. Never sent to the client as-is. */

export interface UserRow {
  id: string;
  kind: 'full' | 'lite';
  name: string;
  handle: string | null;
  email: string | null;
  password: string | null;
  bio: string;
  avatarColor: string;
  householdId: string | null;
  liteForPartyId: string | null;
  deviceIds: string[];
  shareTasteWithParties: boolean;
  createdAt: string;
}

export interface ConstraintRow {
  id: string;
  userId: string;
  kind: 'allergy' | 'diet';
  key: string;
  source: 'structured' | 'statement';
  sourceText: string | null;
  createdAt: string;
}

export interface EvidenceRow {
  id: string;
  userId: string;
  prefType: PrefType;
  key: string;
  kind: 'statement' | 'cooked' | 'ate_out' | 'feedback';
  signal: number;
  explicit: boolean;
  description: string;
  sourceType: 'statement' | 'food_log' | 'recipe_feedback';
  sourceId: string | null;
  createdAt: string;
}

export interface RecipeRow {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  tags: string[];
  flavors: string[];
  timeMinutes: number;
  servings: number;
  emoji: string;
  color: string;
  source: 'catalog' | 'community' | 'ai_generated';
  authorId: string | null;
  /** Raw ingredient text; structured against the verified dataset on read. */
  ingredients: string[];
  steps: string[];
  published: boolean;
  baseRating: { average: number; count: number };
  createdAt: string;
}

export interface FeedbackRow {
  userId: string;
  recipeId: string;
  feedback: 'like' | 'dislike';
  createdAt: string;
}

export interface FoodLogRow {
  id: string;
  userId: string;
  kind: 'home' | 'restaurant';
  dishName: string;
  recipeId: string | null;
  restaurantName: string | null;
  ingredients: string[];
  rating: 'liked' | 'neutral' | 'disliked';
  notes: string;
  eatenOn: string;
  createdAt: string;
}

export interface PantryRow {
  id: string;
  userId: string;
  name: string;
  quantity: string;
  addedAt: string;
}

export interface PartyRow {
  id: string;
  name: string;
  date: string;
  description: string;
  hostId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRow {
  partyId: string;
  userId: string;
  role: 'host' | 'member';
  joinedAt: string;
}

export interface InviteRow {
  id: string;
  partyId: string;
  token: string;
  label: string;
  maxUses: number | null;
  uses: number;
  createdAt: string;
  revokedAt: string | null;
}

export interface ContributionRow {
  id: string;
  partyId: string;
  memberId: string;
  dishName: string;
  recipeId: string | null;
  ingredients: string[];
  course: 'main' | 'side' | 'dessert' | 'drink' | 'other';
  status: 'proposed' | 'claimed' | 'brought';
  createdAt: string;
}

export interface HouseholdRow {
  id: string;
  name: string;
  memberIds: string[];
}

export interface CalendarRow {
  id: string;
  householdId: string;
  date: string;
  slot: 'breakfast' | 'lunch' | 'dinner';
  recipeId: string;
  addedBy: string;
  createdAt: string;
}

export interface PostRow {
  id: string;
  recipeId: string;
  kind: 'review' | 'tip' | 'comment';
  authorId: string;
  rating: number | null;
  body: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface FollowRow {
  followerId: string;
  followeeId: string;
}

export interface DishRow {
  id: string;
  name: string;
  description: string;
  price: string;
  ingredients: string[];
}

export interface RestaurantRow {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  priceLevel: number;
  emoji: string;
  dishes: DishRow[];
}

export interface SessionRow {
  token: string;
  csrf: string;
  userId: string;
  createdAt: string;
}

export interface EventRow {
  name: string;
  properties: Record<string, string | number | boolean | null>;
  sessionId: string;
  partyId: string | null;
  userId: string | null;
  occurredAt: string;
  receivedAt: string;
}

export interface Db {
  version: number;
  users: UserRow[];
  constraints: ConstraintRow[];
  evidence: EvidenceRow[];
  recipes: RecipeRow[];
  feedback: FeedbackRow[];
  foodLogs: FoodLogRow[];
  pantry: PantryRow[];
  parties: PartyRow[];
  memberships: MembershipRow[];
  invites: InviteRow[];
  contributions: ContributionRow[];
  households: HouseholdRow[];
  calendar: CalendarRow[];
  posts: PostRow[];
  follows: FollowRow[];
  restaurants: RestaurantRow[];
  sessions: SessionRow[];
  events: EventRow[];
  loginFailures: Record<string, string[]>;
}

export const DB_VERSION = 1;

export function emptyDb(): Db {
  return {
    version: DB_VERSION,
    users: [],
    constraints: [],
    evidence: [],
    recipes: [],
    feedback: [],
    foodLogs: [],
    pantry: [],
    parties: [],
    memberships: [],
    invites: [],
    contributions: [],
    households: [],
    calendar: [],
    posts: [],
    follows: [],
    restaurants: [],
    sessions: [],
    events: [],
    loginFailures: {},
  };
}
