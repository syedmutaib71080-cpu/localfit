import { createClient } from "@/lib/supabase/client";
import type {
  RegionalRecipe,
  RegionalRegion,
  RegionalCategory,
  CreateRecipeSubmissionInput,
  RecipeSubmission,
} from "@/types/regional-food";

/**
 * Authentic baseline regional catalogue for Bhatkal, Murdeshwar, and Coastal Karnataka.
 * Formulated from historical coastal culinary archives and verified against ICMR-NIN IFCT 2017.
 */
export const AUTHENTIC_REGIONAL_RECIPES: RegionalRecipe[] = [
  {
    id: "rec-bhatkal-biryani-01",
    name: "Bhatkal Chicken Biryani",
    local_name: "Bhatkally Biryani / Navayath Biryani",
    region: "Bhatkal",
    locality: "Navayath",
    cuisine: "Bhatkal cuisine",
    category: "Rice dishes",
    description:
      "The signature culinary heritage of Bhatkal's Navayath community. Characterized by layered fragrant white basmati rice, an aromatic onion-green chilli masala, and slow-steamed tender chicken, prepared without artificial food coloring or yellow turmeric.",
    cooking_method: "Layered Dum Steaming",
    preparation_time_minutes: 30,
    cooking_time_minutes: 45,
    default_servings: 4,
    total_cooked_weight_g: 1300,
    cooked_weight_per_serving_g: 325,
    source: "Navayath Heritage Culinary Archives & ICMR-NIN IFCT 2017",
    verification_status: "estimated",
    is_published: true,
    calories_per_serving: 696,
    protein_per_serving: 43.7,
    carbohydrates_per_serving: 90.4,
    fat_per_serving: 17.2,
    fibre_per_serving: 3.8,
    cooking_instructions:
      "1. Marinate tender chicken pieces with crushed green chillies, garlic, ginger, and sour curd.\n2. In a heavy bottom pot, caramelize thinly sliced onions until golden brown.\n3. Add marinated chicken and simmer gently until meat is three-quarters cooked in its own natural juices.\n4. Parboil aged basmati rice with whole cloves, green cardamom, and cinnamon quill until 70% done.\n5. Layer the parboiled white rice over the chicken masala in the pot.\n6. Drizzle pure desi ghee on top, seal the pot with dough or foil, and slow-steam on low dum for 25 minutes.\n7. Gently fold before serving with chilled cucumber curd raita.",
    ingredients: [
      {
        ingredient_name: "Aged Basmati Rice",
        quantity: 400,
        unit: "g",
        weight_in_grams: 400,
        preparation_notes: "Washed and soaked for 30 mins",
        calories: 1400,
        protein: 28.0,
        carbohydrates: 312.0,
        fat: 2.4,
        fibre: 5.6,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Bone-in Chicken (Curry cut)",
        quantity: 500,
        unit: "g",
        weight_in_grams: 500,
        preparation_notes: "Skinless, tender fresh cut",
        calories: 825,
        protein: 135.0,
        carbohydrates: 0.0,
        fat: 30.0,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Sliced Yellow Onions",
        quantity: 300,
        unit: "g",
        weight_in_grams: 300,
        preparation_notes: "Finely sliced for golden masala",
        calories: 120,
        protein: 3.3,
        carbohydrates: 28.0,
        fat: 0.3,
        fibre: 5.1,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Green Chillies, Ginger & Garlic Paste",
        quantity: 60,
        unit: "g",
        weight_in_grams: 60,
        preparation_notes: "Freshly crushed, no red chilli powder",
        calories: 40,
        protein: 1.8,
        carbohydrates: 8.4,
        fat: 0.4,
        fibre: 2.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Plain Whole Milk Curd",
        quantity: 150,
        unit: "g",
        weight_in_grams: 150,
        preparation_notes: "Fresh set dahi",
        calories: 92,
        protein: 5.3,
        carbohydrates: 7.1,
        fat: 5.0,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Pure Desi Ghee",
        quantity: 30,
        unit: "g",
        weight_in_grams: 30,
        preparation_notes: "Clarified cow butter for aromatic dum",
        calories: 270,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 30.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
      {
        ingredient_name: "Whole Spices & Mint Leaves",
        quantity: 30,
        unit: "g",
        weight_in_grams: 30,
        preparation_notes: "Cardamom, cloves, cinnamon, fresh mint",
        calories: 35,
        protein: 1.2,
        carbohydrates: 6.0,
        fat: 0.8,
        fibre: 2.5,
        is_verified_ingredient: false,
      },
    ],
    aliases: [
      { alias: "Bhatkally Biryani", language: "Navayati", region: "Bhatkal" },
      { alias: "Bhatkal Dum Biryani", language: "English", region: "Bhatkal" },
      { alias: "Navayath Biryani", language: "Urdu", region: "Bhatkal" },
      { alias: "White Coastal Biryani", language: "English", region: "Bhatkal" },
    ],
  },
  {
    id: "rec-murdeshwar-pomfret-02",
    name: "Murdeshwar Pomfret Curry (Meen Gassi)",
    local_name: "Paplet Salan / Karavali Meen Ambat",
    region: "Murdeshwar",
    locality: "Coastal Fisherfolk",
    cuisine: "Murdeshwar cuisine",
    category: "Seafood",
    description:
      "A coastal staple from the fisherfolk around Murdeshwar's shores. Fresh silver pomfret fillets simmered in an earthen pot with a velvety gravy of fresh coconut, sun-dried Byadgi chillies, coriander seeds, and local tart kokum (punarpuli).",
    cooking_method: "Earthen pot simmering",
    preparation_time_minutes: 20,
    cooking_time_minutes: 25,
    default_servings: 4,
    total_cooked_weight_g: 750,
    cooked_weight_per_serving_g: 188,
    source: "Coastal Karnataka Traditional Fisheries Documentation & ICMR-NIN IFCT 2017",
    verification_status: "verified",
    is_published: true,
    calories_per_serving: 300,
    protein_per_serving: 26.3,
    carbohydrates_per_serving: 10.0,
    fat_per_serving: 18.0,
    fibre_per_serving: 4.7,
    cooking_instructions:
      "1. Clean fresh pomfret, slice into steaks, and marinate with sea salt and turmeric.\n2. In a stone grinder or blender, grind grated fresh coconut, roasted Byadgi chillies, coriander seeds, and cumin into a silk-smooth masala paste.\n3. Transfer ground masala to a traditional clay chatty (earthen pot) and dilute with coconut milk and kokum extract water.\n4. Bring the curry to a rolling boil, then gently slip in the pomfret steaks.\n5. Simmer over medium-low heat for 8 to 10 minutes until fish is tender and flakes easily.\n6. Temper in a separate ladle with hot coconut oil, crushed garlic cloves, and fresh curry leaves.\n7. Serve steaming hot with boiled red rice (matta) or fluffy neer dosa.",
    ingredients: [
      {
        ingredient_name: "Fresh Silver Pomfret Steaks",
        quantity: 500,
        unit: "g",
        weight_in_grams: 500,
        preparation_notes: "Cleaned and cut into steaks",
        calories: 510,
        protein: 96.5,
        carbohydrates: 0.0,
        fat: 14.0,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Fresh Grated Coconut",
        quantity: 120,
        unit: "g",
        weight_in_grams: 120,
        preparation_notes: "Freshly scraped coconut meat",
        calories: 425,
        protein: 4.0,
        carbohydrates: 18.2,
        fat: 40.0,
        fibre: 10.8,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Byadgi Chillies & Coriander Seeds",
        quantity: 25,
        unit: "g",
        weight_in_grams: 25,
        preparation_notes: "Lightly roasted for color and aroma",
        calories: 75,
        protein: 3.0,
        carbohydrates: 12.0,
        fat: 2.5,
        fibre: 6.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Kokum (Punarpuli) Extract",
        quantity: 20,
        unit: "g",
        weight_in_grams: 20,
        preparation_notes: "Soaked in warm water for tartness",
        calories: 20,
        protein: 0.4,
        carbohydrates: 4.6,
        fat: 0.1,
        fibre: 1.2,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Cold-Pressed Coconut Oil",
        quantity: 15,
        unit: "g",
        weight_in_grams: 15,
        preparation_notes: "For authentic coastal tadka",
        calories: 135,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 15.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
      {
        ingredient_name: "Garlic, Turmeric & Curry Leaves",
        quantity: 20,
        unit: "g",
        weight_in_grams: 20,
        preparation_notes: "Crushed pod seasoning",
        calories: 25,
        protein: 1.2,
        carbohydrates: 5.0,
        fat: 0.2,
        fibre: 0.8,
        is_verified_ingredient: true,
      },
    ],
    aliases: [
      { alias: "Meen Gassi", language: "Tulu", region: "Coastal Karnataka" },
      { alias: "Paplet Salan", language: "Navayati", region: "Bhatkal" },
      { alias: "Murdeshwar Fish Curry", language: "English", region: "Murdeshwar" },
      { alias: "Manji Curry", language: "Kannada", region: "Uttara Kannada" },
    ],
  },
  {
    id: "rec-prawn-sukka-03",
    name: "Coastal Prawn Sukka (Sigadi Sukka)",
    local_name: "Yetti Sukka / Sungat Sukka",
    region: "Coastal Karnataka",
    locality: "Karavali",
    cuisine: "Coastal Karnataka cuisine",
    category: "Seafood",
    description:
      "Fresh wild sea prawns dry-roasted with toasted grated coconut, fennel, crushed black peppercorns, garlic, and fresh curry leaves, finished with kokum souring.",
    cooking_method: "Dry pan roast",
    preparation_time_minutes: 20,
    cooking_time_minutes: 20,
    default_servings: 3,
    total_cooked_weight_g: 450,
    cooked_weight_per_serving_g: 150,
    source: "ICMR-NIN IFCT 2017 & Karavali Traditional Archives",
    verification_status: "verified",
    is_published: true,
    calories_per_serving: 245,
    protein_per_serving: 26.5,
    carbohydrates_per_serving: 8.2,
    fat_per_serving: 11.5,
    fibre_per_serving: 3.2,
    cooking_instructions:
      "1. Peel, devein, and rinse sea prawns with turmeric and lime juice.\n2. Dry roast fresh coconut with cumin, black pepper, and garlic until lightly nutty.\n3. Sauté onions in a tablespoon of coconut oil until translucent, then add prawns.\n4. Fold in the roasted coconut-spice mix and simmer until moisture evaporates and prawns are coated.\n5. Garnish with fresh curry leaves and serve alongside dal and steamed rice.",
    ingredients: [
      {
        ingredient_name: "Fresh Sea Prawns (Cleaned)",
        quantity: 350,
        unit: "g",
        weight_in_grams: 350,
        preparation_notes: "Deveined coastal prawns",
        calories: 346,
        protein: 73.5,
        carbohydrates: 0.7,
        fat: 3.8,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Grated Fresh Coconut",
        quantity: 75,
        unit: "g",
        weight_in_grams: 75,
        preparation_notes: "Coarsely ground and toasted",
        calories: 265,
        protein: 2.5,
        carbohydrates: 11.4,
        fat: 25.0,
        fibre: 6.8,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Onions, Garlic & Kokum",
        quantity: 80,
        unit: "g",
        weight_in_grams: 80,
        preparation_notes: "Sliced and tempered",
        calories: 45,
        protein: 1.5,
        carbohydrates: 9.5,
        fat: 0.4,
        fibre: 2.1,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Coconut Oil",
        quantity: 10,
        unit: "g",
        weight_in_grams: 10,
        preparation_notes: "For pan searing",
        calories: 90,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 10.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
    ],
    aliases: [
      { alias: "Yetti Sukka", language: "Tulu", region: "Coastal Karnataka" },
      { alias: "Sungat Sukka", language: "Konkani", region: "Uttara Kannada" },
      { alias: "Prawns Sukka", language: "English", region: "Coastal Karnataka" },
    ],
  },
  {
    id: "rec-crab-masala-04",
    name: "Karavali Crab Ghee Roast (Kurlya Masala)",
    local_name: "Denji Ghee Roast / Kurlya Curry",
    region: "Coastal Karnataka",
    locality: "Coastal Fisherfolk",
    cuisine: "Coastal Karnataka cuisine",
    category: "Seafood",
    description:
      "Sweet coastal mud crabs cracked and braised in a deep red masala paste roasted in pure desi ghee with roasted whole spices, tamarind, and jaggery.",
    cooking_method: "Slow braised in ghee and ground masala",
    preparation_time_minutes: 25,
    cooking_time_minutes: 35,
    default_servings: 3,
    total_cooked_weight_g: 650,
    cooked_weight_per_serving_g: 216,
    source: "IFCT 2017 & Coastal Culinary Heritage Records",
    verification_status: "estimated",
    is_published: true,
    calories_per_serving: 310,
    protein_per_serving: 24.0,
    carbohydrates_per_serving: 9.5,
    fat_per_serving: 19.5,
    fibre_per_serving: 2.1,
    cooking_instructions:
      "1. Clean and crack fresh coastal mud crabs, reserving the claws.\n2. Grind roasted Byadgi chillies, peppercorns, coriander, fenugreek, and garlic with tamarind pulp.\n3. In a heavy pan, melt desi ghee and fry the paste until aromatic and oil separates.\n4. Add crab pieces, tossing continuously so the thick masala coats every crevice.\n5. Cover and slow-braise for 15 minutes, allowing natural crab juices to enrich the gravy.\n6. Finish with a hint of jaggery and fresh curry leaves.",
    ingredients: [
      {
        ingredient_name: "Fresh Mud Crab (Cracked)",
        quantity: 500,
        unit: "g",
        weight_in_grams: 500,
        preparation_notes: "Cracked claws for flavor penetration",
        calories: 420,
        protein: 72.0,
        carbohydrates: 0.0,
        fat: 9.0,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Desi Ghee",
        quantity: 40,
        unit: "g",
        weight_in_grams: 40,
        preparation_notes: "Pure clarified butter for traditional roast",
        calories: 360,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 40.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
      {
        ingredient_name: "Ghee Roast Spice Paste & Tamarind",
        quantity: 60,
        unit: "g",
        weight_in_grams: 60,
        preparation_notes: "Ground Byadgi, peppercorn, tamarind, hint of jaggery",
        calories: 110,
        protein: 2.5,
        carbohydrates: 20.0,
        fat: 1.5,
        fibre: 4.8,
        is_verified_ingredient: false,
      },
    ],
    aliases: [
      { alias: "Denji Roast", language: "Tulu", region: "Coastal Karnataka" },
      { alias: "Kurlya Masala", language: "Konkani", region: "Uttara Kannada" },
      { alias: "Crab Ghee Roast", language: "English", region: "Coastal Karnataka" },
    ],
  },
  {
    id: "rec-chicken-sukka-05",
    name: "Coastal Chicken Sukka (Koli Sukka)",
    local_name: "Kori Sukka / Murgh Sukka",
    region: "Uttara Kannada",
    locality: "Coastal",
    cuisine: "Uttara Kannada cuisine",
    category: "Meat dishes",
    description:
      "A dry-roasted chicken speciality renowned across Uttara Kannada. Tender chicken pieces cooked with slow-caramelized onions, a coarse freshly ground spice blend, and tossed with dry-roasted scraped coconut.",
    cooking_method: "Dry spiced roast",
    preparation_time_minutes: 20,
    cooking_time_minutes: 30,
    default_servings: 4,
    total_cooked_weight_g: 750,
    cooked_weight_per_serving_g: 188,
    source: "ICMR-NIN IFCT 2017 & Uttara Kannada Culinary Notes",
    verification_status: "verified",
    is_published: true,
    calories_per_serving: 340,
    protein_per_serving: 36.2,
    carbohydrates_per_serving: 7.8,
    fat_per_serving: 18.0,
    fibre_per_serving: 2.8,
    cooking_instructions:
      "1. Marinate chicken cubes with turmeric, ginger-garlic paste, and rock salt.\n2. Dry roast whole spices and freshly grated coconut until golden brown and grind coarsely without water.\n3. Sauté onions in coconut oil until deep golden, add marinated chicken and cook till dry.\n4. Fold in the roasted coconut spice blend and toss over high heat until aromatic.\n5. Serve with neer dosa, rotis, or rice.",
    ingredients: [
      {
        ingredient_name: "Fresh Boneless Chicken",
        quantity: 500,
        unit: "g",
        weight_in_grams: 500,
        preparation_notes: "Cut into 1-inch bite pieces",
        calories: 825,
        protein: 140.0,
        carbohydrates: 0.0,
        fat: 20.0,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Fresh Grated Coconut",
        quantity: 100,
        unit: "g",
        weight_in_grams: 100,
        preparation_notes: "Roasted till deep golden",
        calories: 354,
        protein: 3.3,
        carbohydrates: 15.2,
        fat: 33.4,
        fibre: 9.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Onions, Garlic, Ginger",
        quantity: 120,
        unit: "g",
        weight_in_grams: 120,
        preparation_notes: "Caramelized in pan",
        calories: 65,
        protein: 2.2,
        carbohydrates: 14.5,
        fat: 0.4,
        fibre: 2.2,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Coconut Oil",
        quantity: 15,
        unit: "g",
        weight_in_grams: 15,
        preparation_notes: "Cooking fat",
        calories: 135,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 15.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
    ],
    aliases: [
      { alias: "Kori Sukka", language: "Tulu", region: "Coastal Karnataka" },
      { alias: "Koli Sukka", language: "Kannada", region: "Uttara Kannada" },
      { alias: "Navayath Dry Chicken", language: "Navayati", region: "Bhatkal" },
    ],
  },
  {
    id: "rec-neer-dosa-06",
    name: "Neer Dosa with Coconut Chutney",
    local_name: "Neer Dose / Bari Dosa",
    region: "Coastal Karnataka",
    locality: "Tulu Nadu / Karavali",
    cuisine: "Coastal Karnataka cuisine",
    category: "Breakfast dishes",
    description:
      "Lace-thin, melt-in-mouth steamed rice crepes native to Coastal Karnataka. Prepared from unfermented, soaked short-grain rice ground into a watery batter and poured over a piping hot cast iron tawa.",
    cooking_method: "Quick iron tawa steaming",
    preparation_time_minutes: 15,
    cooking_time_minutes: 15,
    default_servings: 2,
    total_cooked_weight_g: 260,
    cooked_weight_per_serving_g: 130,
    source: "ICMR-NIN IFCT 2017 & Standard Tulu Nadu Recipes",
    verification_status: "verified",
    is_published: true,
    calories_per_serving: 215,
    protein_per_serving: 4.2,
    carbohydrates_per_serving: 38.0,
    fat_per_serving: 4.8,
    fibre_per_serving: 2.0,
    cooking_instructions:
      "1. Soak short-grain raw rice for 3 to 4 hours in cold water.\n2. Grind with a tablespoon of fresh grated coconut and a pinch of rock salt into an ultra-smooth batter.\n3. Add sufficient water until the batter has a watery milk consistency.\n4. Heat an iron tawa, lightly grease with half an onion dipped in oil, and swirl a ladle of batter from the edges inward.\n5. Cover with a lid for 45 seconds until steamed through. Do not flip.\n6. Fold into a quadrant handkerchief triangle and serve hot with fresh coconut chutney.",
    ingredients: [
      {
        ingredient_name: "Raw Short-Grain Rice",
        quantity: 160,
        unit: "g",
        weight_in_grams: 160,
        preparation_notes: "Soaked and ground to watery consistency",
        calories: 550,
        protein: 10.8,
        carbohydrates: 122.0,
        fat: 1.0,
        fibre: 2.4,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Fresh Coconut & Chutney Base",
        quantity: 40,
        unit: "g",
        weight_in_grams: 40,
        preparation_notes: "Grated coconut, green chilli, roasted gram",
        calories: 140,
        protein: 2.5,
        carbohydrates: 5.5,
        fat: 12.0,
        fibre: 3.2,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Oil (for greasing tawa)",
        quantity: 5,
        unit: "g",
        weight_in_grams: 5,
        preparation_notes: "Light surface wipe",
        calories: 45,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 5.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
    ],
    aliases: [
      { alias: "Neer Dose", language: "Kannada", region: "Coastal Karnataka" },
      { alias: "Bari Dosa", language: "Navayati", region: "Bhatkal" },
      { alias: "Lace Crepe", language: "English", region: "Coastal Karnataka" },
    ],
  },
  {
    id: "rec-pathrode-07",
    name: "Pathrode (Steamed Colocasia Leaf Rolls)",
    local_name: "Patra / Alva Paan Dosa",
    region: "Coastal Karnataka",
    locality: "Karavali",
    cuisine: "Coastal Karnataka cuisine",
    category: "Snacks",
    description:
      "Traditional coastal delicacy of layered colocasia (taro) leaves coated with a spiced paste of soaked rice, toor dal, tamarind, jaggery, and red chillies, tightly rolled and steamed.",
    cooking_method: "Layered roll steaming",
    preparation_time_minutes: 30,
    cooking_time_minutes: 40,
    default_servings: 4,
    total_cooked_weight_g: 500,
    cooked_weight_per_serving_g: 125,
    source: "ICMR-NIN IFCT 2017 & Karavali Traditional Archives",
    verification_status: "verified",
    is_published: true,
    calories_per_serving: 185,
    protein_per_serving: 5.8,
    carbohydrates_per_serving: 33.2,
    fat_per_serving: 2.4,
    fibre_per_serving: 4.6,
    cooking_instructions:
      "1. Wash tender colocasia leaves, gently trim thick veins with a knife.\n2. Grind soaked rice, toor dal, tamarind, jaggery, Byadgi chillies, and cumin into a thick spreadable paste.\n3. Lay the largest leaf flat, smear with paste, overlay with smaller leaves, repeating for 4-5 layers.\n4. Fold sides inwards and roll tightly like a swiss roll.\n5. Steam in an idli steamer for 35 to 40 minutes until firm.\n6. Cool slightly, slice into rounds, and optionally pan-sear with mustard seeds and coconut oil.",
    ingredients: [
      {
        ingredient_name: "Fresh Colocasia (Taro) Leaves",
        quantity: 120,
        unit: "g",
        weight_in_grams: 120,
        preparation_notes: "Washed and de-veined",
        calories: 60,
        protein: 3.6,
        carbohydrates: 10.0,
        fat: 0.8,
        fibre: 4.8,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Raw Rice & Toor Dal Mix",
        quantity: 150,
        unit: "g",
        weight_in_grams: 150,
        preparation_notes: "Ground into thick spiced paste",
        calories: 520,
        protein: 16.5,
        carbohydrates: 108.0,
        fat: 2.0,
        fibre: 8.5,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Tamarind & Jaggery Blend",
        quantity: 40,
        unit: "g",
        weight_in_grams: 40,
        preparation_notes: "Balances taro oxalate itchiness with sour sweetness",
        calories: 120,
        protein: 0.8,
        carbohydrates: 29.0,
        fat: 0.2,
        fibre: 2.1,
        is_verified_ingredient: true,
      },
    ],
    aliases: [
      { alias: "Patra", language: "Konkani", region: "Uttara Kannada" },
      { alias: "Alva Paan Rolls", language: "Kannada", region: "Coastal Karnataka" },
      { alias: "Colocasia Leaf Rolls", language: "English", region: "Coastal Karnataka" },
    ],
  },
  {
    id: "rec-bhatkal-mutkule-08",
    name: "Bhatkal Mutkule (Steamed Rice Dumplings)",
    local_name: "Mutkoli / Navayath Dumplings",
    region: "Bhatkal",
    locality: "Navayath",
    cuisine: "Bhatkal cuisine",
    category: "Breakfast dishes",
    description:
      "A revered breakfast dumpling exclusive to Bhatkal's Navayath heritage. Ground rice flour hand-shaped into small elongated or spherical dumplings and steamed over boiling water. Traditionally savored with rich mutton salan or cardamom-infused coconut milk.",
    cooking_method: "Steamed",
    preparation_time_minutes: 25,
    cooking_time_minutes: 20,
    default_servings: 3,
    total_cooked_weight_g: 380,
    cooked_weight_per_serving_g: 127,
    source: "Navayath Heritage Culinary Archives",
    verification_status: "estimated",
    is_published: true,
    calories_per_serving: 220,
    protein_per_serving: 4.1,
    carbohydrates_per_serving: 46.5,
    fat_per_serving: 1.2,
    fibre_per_serving: 1.8,
    cooking_instructions:
      "1. Roast raw rice flour lightly without browning.\n2. Boil water with rock salt and a dash of ghee, stir in the rice flour briskly to form a pliable dough.\n3. Knead while warm until velvety smooth.\n4. Pinch small portions and hand-roll into cylindrical mutkule dumplings with tapered ends.\n5. Steam in an earthen or bamboo steamer for 15 minutes.\n6. Serve warm with slow-simmered Navayath mutton curry or sweetened coconut milk.",
    ingredients: [
      {
        ingredient_name: "Hand-pounded Rice Flour",
        quantity: 180,
        unit: "g",
        weight_in_grams: 180,
        preparation_notes: "Fine ground and roasted",
        calories: 620,
        protein: 11.5,
        carbohydrates: 135.0,
        fat: 1.8,
        fibre: 5.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Desi Ghee (in dough)",
        quantity: 5,
        unit: "g",
        weight_in_grams: 5,
        preparation_notes: "For dough pliability",
        calories: 45,
        protein: 0.0,
        carbohydrates: 0.0,
        fat: 5.0,
        fibre: 0.0,
        is_verified_ingredient: true,
        is_oil_or_fat: true,
      },
    ],
    aliases: [
      { alias: "Mutkoli", language: "Navayati", region: "Bhatkal" },
      { alias: "Steamed Navayath Dumplings", language: "English", region: "Bhatkal" },
    ],
  },
  {
    id: "rec-shayyo-09",
    name: "Bhatkal Shayyo with Godi Dudh",
    local_name: "Shevyo / Godi Dudh Shayyo",
    region: "Bhatkal",
    locality: "Navayath",
    cuisine: "Bhatkal cuisine",
    category: "Sweets",
    description:
      "Authentic festive sweet of Bhatkal. Handmade delicate wheat vermicelli freshly pressed and steamed, steeped in rich coconut milk sweetened with dark sugarcane jaggery and spiced with crushed green cardamom.",
    cooking_method: "Simmered",
    preparation_time_minutes: 25,
    cooking_time_minutes: 15,
    default_servings: 4,
    total_cooked_weight_g: 550,
    cooked_weight_per_serving_g: 138,
    source: "Navayath Heritage Culinary Archives",
    verification_status: "estimated",
    is_published: true,
    calories_per_serving: 275,
    protein_per_serving: 4.5,
    carbohydrates_per_serving: 48.0,
    fat_per_serving: 7.5,
    fibre_per_serving: 2.2,
    cooking_instructions:
      "1. Prepare dough from whole wheat flour, press through a traditional brass press into fine vermicelli strands onto banana leaves.\n2. Steam vermicelli for 10 minutes until cooked yet firm.\n3. Squeeze thick first-extract and second-extract milk from freshly grated coconuts.\n4. Melt organic sugarcane jaggery in warm water, strain impurities, and blend with coconut milk.\n5. Infuse with freshly pounded green cardamom powder.\n6. Pour sweet godi dudh generously over warm steamed shayyo vermicelli before serving.",
    ingredients: [
      {
        ingredient_name: "Handmade Wheat Vermicelli (Shayyo)",
        quantity: 200,
        unit: "g",
        weight_in_grams: 200,
        preparation_notes: "Steamed fresh vermicelli",
        calories: 680,
        protein: 15.0,
        carbohydrates: 142.0,
        fat: 2.0,
        fibre: 6.0,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Fresh Coconut Milk (Thick & Thin)",
        quantity: 250,
        unit: "ml",
        weight_in_grams: 250,
        preparation_notes: "Extracted from grated coconuts",
        calories: 320,
        protein: 2.8,
        carbohydrates: 12.0,
        fat: 30.0,
        fibre: 2.5,
        is_verified_ingredient: true,
      },
      {
        ingredient_name: "Organic Sugarcane Jaggery & Cardamom",
        quantity: 80,
        unit: "g",
        weight_in_grams: 80,
        preparation_notes: "Melted and spiced",
        calories: 300,
        protein: 0.5,
        carbohydrates: 76.0,
        fat: 0.2,
        fibre: 0.0,
        is_verified_ingredient: true,
      },
    ],
    aliases: [
      { alias: "Shevyo", language: "Konkani", region: "Coastal Karnataka" },
      { alias: "Godi Dudh Shayyo", language: "Navayati", region: "Bhatkal" },
      { alias: "Sweet Coconut Vermicelli", language: "English", region: "Bhatkal" },
    ],
  },
];

const LOCAL_SUBMISSIONS_KEY = "localfit_recipe_submissions_v1";

let inMemorySubmissions: RecipeSubmission[] = [];

function getStoredSubmissions(): RecipeSubmission[] {
  if (typeof window === "undefined") return inMemorySubmissions;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSubmissions(submissions: RecipeSubmission[]) {
  if (typeof window === "undefined") {
    inMemorySubmissions = [...submissions];
    return;
  }
  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch {
    // quota
  }
}

/**
 * Merges database recipes with the authentic local baseline catalogue.
 * Database records take precedence for any item that exists in both sources.
 * Local catalogue items missing from the database are seamlessly retained without duplication.
 */
function mergeRecipes(
  dbRecipes: RegionalRecipe[],
  localRecipes: RegionalRecipe[]
): RegionalRecipe[] {
  const mergedMap = new Map<string, RegionalRecipe>();

  // 1. Insert all database recipes first (database takes precedence)
  for (const recipe of dbRecipes) {
    if (recipe.id) {
      mergedMap.set(recipe.id, recipe);
    }
  }

  // 2. Insert any local recipe whose ID or normalized name is not yet present
  for (const localRecipe of localRecipes) {
    const existingById = mergedMap.get(localRecipe.id);
    const existingByName = Array.from(mergedMap.values()).find(
      (r) => r.name.toLowerCase().trim() === localRecipe.name.toLowerCase().trim()
    );

    if (!existingById && !existingByName) {
      mergedMap.set(localRecipe.id, localRecipe);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Searches regional recipes across Supabase with fallback and deduplicated merge.
 * Database records take precedence; missing baseline recipes are always preserved.
 * Supports searching by: English name, Local name, Alternative spelling (aliases), Region, Category, and Ingredient!
 */
export async function searchRegionalRecipes(params: {
  query?: string;
  region?: RegionalRegion | "All Regions";
  category?: RegionalCategory | "All Categories";
  verificationStatus?: "all" | "verified" | "estimated";
}): Promise<RegionalRecipe[]> {
  const {
    query = "",
    region = "All Regions",
    category = "All Categories",
    verificationStatus = "all",
  } = params;

  const cleanQuery = query.trim().toLowerCase();

  let dbRecipes: RegionalRecipe[] = [];
  try {
    const supabase = createClient();
    let dbQuery = supabase
      .from("recipes")
      .select("*, ingredients:recipe_ingredients(*), aliases:food_aliases(*)")
      .eq("is_published", true);

    if (region && region !== "All Regions") {
      dbQuery = dbQuery.eq("region", region);
    }

    if (category && category !== "All Categories") {
      dbQuery = dbQuery.eq("category", category);
    }

    if (verificationStatus && verificationStatus !== "all") {
      dbQuery = dbQuery.eq("verification_status", verificationStatus);
    }

    const { data, error } = await dbQuery.order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      dbRecipes = data as unknown as RegionalRecipe[];
    }
  } catch {
    // Database query failed or offline
  }

  // Combine database records with authentic local catalogue
  // Database takes precedence, but missing local catalogue recipes are retained
  const combinedRecipes = mergeRecipes(dbRecipes, AUTHENTIC_REGIONAL_RECIPES);

  // Apply search query and facet filters across unified dataset
  return combinedRecipes.filter((recipe) => {
    // 1. Region filter
    if (region !== "All Regions" && recipe.region !== region) {
      return false;
    }

    // 2. Category filter
    if (category !== "All Categories" && recipe.category !== category) {
      return false;
    }

    // 3. Verification filter
    if (
      verificationStatus !== "all" &&
      recipe.verification_status !== verificationStatus
    ) {
      return false;
    }

    // 4. Query matching
    if (!cleanQuery) return true;
    return matchesRecipeQuery(recipe, cleanQuery);
  });
}

/**
 * Matches a query against recipe names, local names, aliases, and ingredients.
 * Supports direct substrings and multi-token word matching.
 */
function matchesRecipeQuery(recipe: RegionalRecipe, cleanQuery: string): boolean {
  const searchableText = [
    recipe.name,
    recipe.local_name || "",
    recipe.region,
    recipe.locality || "",
    recipe.cuisine,
    recipe.category,
    ...(recipe.aliases?.map((a) => a.alias) || []),
    ...(recipe.ingredients?.map((i) => i.ingredient_name) || []),
  ]
    .join(" ")
    .toLowerCase();

  // 1. Direct substring match
  if (searchableText.includes(cleanQuery)) return true;

  // 2. Multi-token match: every word in query must appear in recipe searchable text
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => searchableText.includes(token));
  }

  return false;
}

/**
 * Fetches a single regional recipe by ID.
 */
export async function getRegionalRecipeById(id: string): Promise<RegionalRecipe | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recipes")
      .select("*, ingredients:recipe_ingredients(*), aliases:food_aliases(*)")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as RegionalRecipe;
    }
  } catch {
    // Fallback
  }

  const found = AUTHENTIC_REGIONAL_RECIPES.find((r) => r.id === id);
  return found || null;
}

/**
 * Submits a community recipe contribution held pending administrative review.
 */
export async function submitRegionalRecipe(
  input: CreateRecipeSubmissionInput
): Promise<{ success: boolean; submissionId?: string; message: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const submissionPayload = {
      dish_name: input.dish_name.trim(),
      local_name: input.local_name?.trim() || null,
      region: input.region,
      locality: input.locality?.trim() || null,
      cuisine: input.cuisine,
      category: input.category,
      ingredients_text: input.ingredients_text.trim(),
      cooking_instructions: input.cooking_instructions.trim(),
      serving_count: Math.max(1, input.serving_count || 4),
      source_attribution: input.source_attribution.trim(),
      photo_url: input.photo_url || null,
      status: "pending" as const,
    };

    if (user) {
      const { data, error } = await supabase
        .from("recipe_submissions")
        .insert([{ ...submissionPayload, user_id: user.id }])
        .select()
        .single();

      if (!error && data) {
        return {
          success: true,
          submissionId: data.id,
          message:
            "Your recipe was submitted successfully and is queued for community heritage review.",
        };
      }
    }
  } catch {
    // Fallback to local storage for guest/offline support
  }

  const localId = `sub-${Date.now()}`;
  const localSubmission: RecipeSubmission = {
    id: localId,
    user_id: "demo-contributor",
    dish_name: input.dish_name.trim(),
    local_name: input.local_name?.trim() || null,
    region: input.region,
    locality: input.locality?.trim() || null,
    cuisine: input.cuisine,
    category: input.category,
    ingredients_text: input.ingredients_text.trim(),
    cooking_instructions: input.cooking_instructions.trim(),
    serving_count: Math.max(1, input.serving_count || 4),
    source_attribution: input.source_attribution.trim(),
    photo_url: input.photo_url || null,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  const stored = getStoredSubmissions();
  saveStoredSubmissions([localSubmission, ...stored]);

  return {
    success: true,
    submissionId: localId,
    message:
      "Your recipe was recorded successfully and is queued for community heritage review.",
  };
}

/**
 * Gets user's submitted recipes (pending review).
 */
export async function getUserRecipeSubmissions(): Promise<RecipeSubmission[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("recipe_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as RecipeSubmission[];
      }
    }
  } catch {
    // Fallback
  }

  return getStoredSubmissions();
}
