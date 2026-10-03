/** Static option lists shared by several forms. */
export const CUISINE_OPTIONS = [
  'american',
  'chinese',
  'french',
  'indian',
  'italian',
  'japanese',
  'korean',
  'mediterranean',
  'mexican',
  'middle eastern',
  'thai',
  'vietnamese',
];

export const COURSE_OPTIONS = [
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
  { value: 'other', label: 'Other' },
] as const;

export const MEAL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
] as const;
