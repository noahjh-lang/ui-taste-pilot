import { z } from 'zod';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';
import { ingredientSchema, scoreSchema } from './recipes';
import { safetyResultSchema } from './safety';

// --- Food history -----------------------------------------------------------

export const foodLogSchema = z.object({
  id: idSchema,
  kind: z.enum(['home', 'restaurant']),
  dishName: z.string(),
  recipeId: idSchema.nullable(),
  restaurantName: z.string().nullable(),
  ingredients: z.array(ingredientSchema),
  rating: z.enum(['liked', 'neutral', 'disliked']),
  notes: z.string(),
  eatenOn: isoDateSchema,
  createdAt: isoDateTimeSchema,
  /** Preferences this entry contributed evidence to. */
  affectedPreferences: z.array(z.string()),
});
export type FoodLog = z.infer<typeof foodLogSchema>;

export const foodLogInputSchema = z.object({
  kind: z.enum(['home', 'restaurant']),
  dishName: z.string().trim().min(2, 'What did you eat?').max(80),
  recipeId: idSchema.nullable(),
  restaurantName: z.string().trim().max(80).nullable(),
  ingredients: z.array(z.string().trim().min(1)),
  rating: z.enum(['liked', 'neutral', 'disliked']),
  notes: z.string().trim().max(500),
  eatenOn: isoDateSchema,
});
export type FoodLogInput = z.infer<typeof foodLogInputSchema>;

// --- Pantry -------------------------------------------------------------------

export const pantryItemSchema = z.object({
  id: idSchema,
  name: z.string(),
  canonical: z.string().nullable(),
  quantity: z.string(),
  addedAt: isoDateTimeSchema,
});
export type PantryItem = z.infer<typeof pantryItemSchema>;

export const pantryInputSchema = z.object({
  name: z.string().trim().min(2, 'Name the ingredient').max(60),
  quantity: z.string().trim().max(30),
});
export type PantryInput = z.infer<typeof pantryInputSchema>;

// --- Restaurants --------------------------------------------------------------

export const rankedDishSchema = z.object({
  dish: z.object({
    id: idSchema,
    name: z.string(),
    description: z.string(),
    price: z.string(),
    ingredients: z.array(ingredientSchema),
  }),
  safety: safetyResultSchema,
  score: scoreSchema,
});
export type RankedDish = z.infer<typeof rankedDishSchema>;

export const restaurantRecommendationSchema = z.object({
  restaurant: z.object({
    id: idSchema,
    name: z.string(),
    cuisine: z.string(),
    neighborhood: z.string(),
    priceLevel: z.number().int().min(1).max(4),
    emoji: z.string(),
  }),
  /** Mean of the top dishes' scores; dishes keep their own safety. */
  matchScore: z.number(),
  dishes: z.array(rankedDishSchema),
  safeDishCount: z.number().int(),
});
export type RestaurantRecommendation = z.infer<typeof restaurantRecommendationSchema>;

// --- Calendar -----------------------------------------------------------------

export const mealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner']);
export type MealSlot = z.infer<typeof mealSlotSchema>;

export const calendarEntrySchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  slot: mealSlotSchema,
  recipeId: idSchema,
  recipeTitle: z.string(),
  recipeEmoji: z.string(),
  addedByName: z.string(),
  /** Checked against every household member's constraints. */
  safety: safetyResultSchema,
});
export type CalendarEntry = z.infer<typeof calendarEntrySchema>;

export const calendarSchema = z.object({
  householdName: z.string(),
  members: z.array(z.object({ userId: idSchema, name: z.string(), avatarColor: z.string() })),
  entries: z.array(calendarEntrySchema),
});
export type Calendar = z.infer<typeof calendarSchema>;

export const calendarEntryInputSchema = z.object({
  date: isoDateSchema,
  slot: mealSlotSchema,
  recipeId: idSchema,
});
export type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>;
