/**
 * Stand-in for the verified ingredient/allergen dataset. Only ingredients in
 * this table can ever be judged safe; anything else is "unmapped" and makes a
 * safety result `unverified`.
 */

export const ALLERGENS = {
  peanut: 'Peanuts',
  tree_nut: 'Tree nuts',
  milk: 'Milk / dairy',
  egg: 'Eggs',
  gluten: 'Gluten (wheat, barley, rye)',
  soy: 'Soy',
  fish: 'Fish',
  shellfish: 'Shellfish',
  sesame: 'Sesame',
} as const;
export type AllergenKey = keyof typeof ALLERGENS;

export const DIETS = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  gluten_free: 'Gluten-free',
  dairy_free: 'Dairy-free',
} as const;
export type DietKey = keyof typeof DIETS;

export type Category =
  'meat' | 'poultry' | 'fish' | 'shellfish' | 'dairy' | 'egg' | 'honey' | 'plant';

/** Animal categories each diet excludes, plus allergens it implies. */
export const DIET_RULES: Record<DietKey, { excludes: Category[]; allergens: AllergenKey[] }> = {
  vegetarian: { excludes: ['meat', 'poultry', 'fish', 'shellfish'], allergens: [] },
  vegan: {
    excludes: ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey'],
    allergens: [],
  },
  pescatarian: { excludes: ['meat', 'poultry'], allergens: [] },
  gluten_free: { excludes: [], allergens: ['gluten'] },
  dairy_free: { excludes: ['dairy'], allergens: ['milk'] },
};

export interface IngredientEntry {
  key: string;
  label: string;
  aliases: string[];
  allergens: AllergenKey[];
  category: Category;
  /** Pantry staples don't count toward taste evidence or pantry coverage. */
  staple?: boolean;
}

const e = (
  key: string,
  aliases: string[],
  allergens: AllergenKey[] = [],
  category: Category = 'plant',
  staple = false,
): IngredientEntry => ({
  key,
  label: aliases[0] ?? key,
  aliases,
  allergens,
  category,
  staple,
});

export const INGREDIENTS: IngredientEntry[] = [
  // Nuts and seeds -- peanuts are legumes, kept separate from tree nuts.
  e('peanut', ['peanut', 'peanuts', 'roasted peanuts'], ['peanut']),
  e('peanut_butter', ['peanut butter'], ['peanut']),
  e('almond', ['almond', 'almonds', 'almond flour', 'sliced almonds'], ['tree_nut']),
  e('almond_milk', ['almond milk'], ['tree_nut']),
  e('oat_milk', ['oat milk'], []),
  e('soy_milk', ['soy milk'], ['soy']),
  e('cashew', ['cashew', 'cashews'], ['tree_nut']),
  e('walnut', ['walnut', 'walnuts'], ['tree_nut']),
  e('pecan', ['pecan', 'pecans'], ['tree_nut']),
  e('pistachio', ['pistachio', 'pistachios'], ['tree_nut']),
  e('pine_nut', ['pine nut', 'pine nuts'], ['tree_nut']),
  e('hazelnut', ['hazelnut', 'hazelnuts'], ['tree_nut']),
  e('pesto', ['pesto', 'basil pesto'], ['tree_nut', 'milk']),
  e('sesame', ['sesame seeds', 'sesame seed', 'sesame'], ['sesame']),
  e('sesame_oil', ['sesame oil', 'toasted sesame oil'], ['sesame']),
  e('tahini', ['tahini'], ['sesame']),
  e('coconut', ['coconut', 'shredded coconut'], []),
  e('coconut_milk', ['coconut milk', 'coconut cream'], []),
  e('nutmeg', ['nutmeg'], [], 'plant', true),
  e('butternut_squash', ['butternut squash'], []),

  // Dairy
  e('butter', ['butter', 'unsalted butter'], ['milk'], 'dairy'),
  e('milk', ['milk', 'whole milk'], ['milk'], 'dairy'),
  e('cream', ['heavy cream', 'cream', 'double cream'], ['milk'], 'dairy'),
  e('sour_cream', ['sour cream'], ['milk'], 'dairy'),
  e('yogurt', ['yogurt', 'greek yogurt', 'yoghurt'], ['milk'], 'dairy'),
  e('parmesan', ['parmesan', 'parmigiano', 'parmesan cheese'], ['milk'], 'dairy'),
  e('mozzarella', ['mozzarella', 'fresh mozzarella'], ['milk'], 'dairy'),
  e('cheddar', ['cheddar', 'cheddar cheese'], ['milk'], 'dairy'),
  e('feta', ['feta', 'feta cheese'], ['milk'], 'dairy'),
  e('ricotta', ['ricotta'], ['milk'], 'dairy'),
  e('paneer', ['paneer'], ['milk'], 'dairy'),
  e('ghee', ['ghee'], ['milk'], 'dairy'),
  e('mascarpone', ['mascarpone'], ['milk'], 'dairy'),

  // Eggs
  e('egg', ['egg', 'eggs', 'egg yolk', 'egg yolks', 'egg whites'], ['egg'], 'egg'),
  e('mayonnaise', ['mayonnaise', 'mayo'], ['egg'], 'egg'),

  // Gluten
  e('flour', ['all-purpose flour', 'flour', 'plain flour', 'bread flour'], ['gluten']),
  e('pasta', ['pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'rigatoni'], ['gluten']),
  e('bread', ['bread', 'sourdough', 'baguette', 'breadcrumbs', 'panko'], ['gluten']),
  e('tortilla_flour', ['flour tortillas', 'flour tortilla'], ['gluten']),
  e('ramen_noodles', ['ramen noodles', 'udon noodles', 'udon'], ['gluten']),
  e('egg_noodles', ['egg noodles'], ['gluten', 'egg']),
  e('couscous', ['couscous'], ['gluten']),
  e('bulgur', ['bulgur', 'bulgur wheat'], ['gluten']),
  e('ladyfingers', ['ladyfingers', 'savoiardi'], ['gluten', 'egg']),
  e('barley', ['barley', 'pearl barley'], ['gluten']),
  e('pizza_dough', ['pizza dough'], ['gluten']),
  e('soy_sauce', ['soy sauce', 'light soy sauce', 'dark soy sauce'], ['soy', 'gluten']),
  e('tamari', ['tamari'], ['soy']),

  // Soy
  e('tofu', ['tofu', 'firm tofu', 'silken tofu'], ['soy']),
  e('miso', ['miso', 'white miso', 'miso paste'], ['soy']),
  e('edamame', ['edamame'], ['soy']),

  // Fish and shellfish
  e('salmon', ['salmon', 'salmon fillet', 'salmon fillets'], ['fish'], 'fish'),
  e('cod', ['cod', 'white fish'], ['fish'], 'fish'),
  e('tuna', ['tuna', 'canned tuna'], ['fish'], 'fish'),
  e('anchovy', ['anchovy', 'anchovies'], ['fish'], 'fish'),
  e('fish_sauce', ['fish sauce'], ['fish'], 'fish'),
  // Dashi is usually made with bonito (fish).
  e('dashi', ['dashi', 'dashi stock'], ['fish'], 'fish'),
  e('shrimp', ['shrimp', 'prawns', 'prawn'], ['shellfish'], 'shellfish'),
  e('crab', ['crab', 'crab meat'], ['shellfish'], 'shellfish'),
  e('lobster', ['lobster'], ['shellfish'], 'shellfish'),
  e('mussels', ['mussels', 'clams'], ['shellfish'], 'shellfish'),
  e('oyster_sauce', ['oyster sauce'], ['shellfish'], 'shellfish'),

  // Meat and poultry
  e('chicken', ['chicken', 'chicken thighs', 'chicken breast', 'chicken breasts'], [], 'poultry'),
  e('chicken_stock', ['chicken stock', 'chicken broth'], [], 'poultry'),
  e('turkey', ['turkey', 'ground turkey'], [], 'poultry'),
  e(
    'beef',
    ['beef', 'ground beef', 'steak', 'flank steak', 'beef chuck', 'beef bones'],
    [],
    'meat',
  ),
  e('pork', ['pork', 'pork shoulder', 'ground pork', 'pork belly'], [], 'meat'),
  e('bacon', ['bacon', 'pancetta'], [], 'meat'),
  e('chorizo', ['chorizo'], [], 'meat'),
  e('lamb', ['lamb', 'ground lamb'], [], 'meat'),
  e('honey', ['honey'], [], 'honey'),

  // Produce
  e('garlic', ['garlic', 'garlic cloves'], [], 'plant', true),
  e(
    'onion',
    ['onion', 'onions', 'red onion', 'yellow onion', 'shallot', 'shallots'],
    [],
    'plant',
    true,
  ),
  e('ginger', ['ginger', 'fresh ginger'], []),
  e('tomato', ['tomato', 'tomatoes', 'cherry tomatoes', 'canned tomatoes', 'crushed tomatoes'], []),
  e('tomato_paste', ['tomato paste'], []),
  e('basil', ['basil', 'thai basil', 'fresh basil'], []),
  e('cilantro', ['cilantro', 'coriander leaves', 'fresh coriander'], []),
  e('parsley', ['parsley', 'flat-leaf parsley'], []),
  e('mint', ['mint', 'fresh mint'], []),
  e('lime', ['lime', 'limes', 'lime juice'], []),
  e('lemon', ['lemon', 'lemons', 'lemon juice', 'lemon zest'], []),
  e(
    'chili',
    [
      'chili',
      'chilies',
      'red chili',
      'bird eye chili',
      'jalapeno',
      'chili flakes',
      'red pepper flakes',
    ],
    [],
  ),
  // Chili crisp is absent on purpose: recipes vary and some contain peanuts.
  e('gochujang', ['gochujang'], ['soy', 'gluten']),
  e('bell_pepper', ['bell pepper', 'bell peppers', 'red pepper', 'capsicum'], []),
  e('mushroom', ['mushroom', 'mushrooms', 'cremini mushrooms', 'shiitake'], []),
  e('spinach', ['spinach', 'baby spinach'], []),
  e('kale', ['kale'], []),
  e('cucumber', ['cucumber', 'cucumbers'], []),
  e('carrot', ['carrot', 'carrots'], []),
  e('potato', ['potato', 'potatoes', 'sweet potato', 'sweet potatoes'], []),
  e('zucchini', ['zucchini', 'courgette'], []),
  e('eggplant', ['eggplant', 'aubergine'], []),
  e('avocado', ['avocado', 'avocados'], []),
  e('lettuce', ['lettuce', 'romaine', 'mixed greens'], []),
  // Kimchi is deliberately absent: many contain fish sauce or shrimp, so it must stay unverified.
  e('cabbage', ['cabbage', 'napa cabbage'], []),
  e('scallion', ['scallion', 'scallions', 'green onion', 'green onions'], []),
  e('corn', ['corn', 'sweetcorn', 'corn tortillas'], []),
  e('peas', ['peas', 'green peas'], []),
  e('broccoli', ['broccoli'], []),
  e('cauliflower', ['cauliflower'], []),
  e('berries', ['berries', 'strawberries', 'blueberries', 'raspberries'], []),
  e('banana', ['banana', 'bananas'], []),
  e('apple', ['apple', 'apples'], []),
  e('mango', ['mango', 'mangoes'], []),
  e('orange', ['orange', 'oranges', 'orange juice'], []),
  e('watermelon', ['watermelon'], []),
  e('lemongrass', ['lemongrass'], []),
  e('olives', ['olives', 'kalamata olives', 'black olives', 'green olives'], []),
  e('celery', ['celery', 'celery stalks'], []),
  e('green_beans', ['green beans'], []),
  e('papaya', ['papaya', 'green papaya'], []),
  e('seaweed', ['wakame', 'nori', 'seaweed'], []),
  e('star_anise', ['star anise'], [], 'plant', true),
  e('espresso', ['espresso', 'coffee'], []),

  // Legumes and grains (gluten-free)
  // "Glutinous" rice has no gluten; the name only means sticky.
  e(
    'rice',
    [
      'rice',
      'jasmine rice',
      'basmati rice',
      'arborio rice',
      'sushi rice',
      'brown rice',
      'glutinous rice',
      'cooked rice',
    ],
    [],
  ),
  e('glass_noodles', ['sweet potato noodles', 'glass noodles'], []),
  e('rice_noodles', ['rice noodles', 'rice vermicelli'], []),
  e('quinoa', ['quinoa'], []),
  e('oats', ['oats', 'rolled oats'], []),
  e('chickpeas', ['chickpeas', 'garbanzo beans'], []),
  e('black_beans', ['black beans'], []),
  e('lentils', ['lentils', 'red lentils', 'green lentils'], []),
  e('kidney_beans', ['kidney beans'], []),
  e('cornstarch', ['cornstarch', 'corn starch'], [], 'plant', true),

  // Pantry
  e('olive_oil', ['olive oil', 'extra virgin olive oil'], [], 'plant', true),
  e('vegetable_oil', ['vegetable oil', 'neutral oil', 'canola oil'], [], 'plant', true),
  e('salt', ['salt', 'sea salt', 'kosher salt'], [], 'plant', true),
  e('pepper', ['black pepper', 'pepper'], [], 'plant', true),
  e('sugar', ['sugar', 'brown sugar', 'caster sugar', 'palm sugar'], [], 'plant', true),
  e('water', ['water'], [], 'plant', true),
  e(
    'vinegar',
    ['vinegar', 'rice vinegar', 'red wine vinegar', 'balsamic vinegar'],
    [],
    'plant',
    true,
  ),
  e('vegetable_stock', ['vegetable stock', 'vegetable broth'], [], 'plant', true),
  e('cumin', ['cumin', 'ground cumin'], [], 'plant', true),
  e('paprika', ['paprika', 'smoked paprika'], [], 'plant', true),
  e('turmeric', ['turmeric'], [], 'plant', true),
  e('cinnamon', ['cinnamon'], [], 'plant', true),
  e('oregano', ['oregano', 'dried oregano'], [], 'plant', true),
  e('vanilla', ['vanilla', 'vanilla extract'], [], 'plant', true),
  e('baking_powder', ['baking powder', 'baking soda'], [], 'plant', true),
  e('maple_syrup', ['maple syrup'], []),
  e('dark_chocolate', ['dark chocolate', 'cocoa powder', 'cocoa'], []),
  e('white_wine', ['white wine', 'dry white wine'], []),
];

const BY_KEY = new Map(INGREDIENTS.map((entry) => [entry.key, entry]));

export function ingredientByKey(key: string) {
  return BY_KEY.get(key);
}

export const FLAVORS = [
  'spicy',
  'sweet',
  'savory',
  'sour',
  'smoky',
  'herby',
  'umami',
  'creamy',
  'fresh',
  'rich',
];
export const CUISINES = [
  'thai',
  'italian',
  'mexican',
  'indian',
  'japanese',
  'korean',
  'chinese',
  'mediterranean',
  'american',
  'middle eastern',
  'vietnamese',
  'french',
];
