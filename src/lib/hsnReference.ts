/**
 * A curated, offline reference of common HSN/SAC codes, searchable by
 * product keyword. There is no free public government API for
 * auto-detecting HSN codes from a product name, so this ships as a
 * built-in list covering common categories a small Indian business is
 * likely to sell — matched by keyword rather than looked up live.
 *
 * This is a starting reference, not exhaustive or authoritative — always
 * double check the exact HSN code for GST filing with a tax professional
 * or the official GST rate finder if precision matters.
 */
export interface HsnEntry {
  code: string;
  label: string;
  keywords: string[];
}

export const HSN_REFERENCE: HsnEntry[] = [
  { code: "0901", label: "Coffee", keywords: ["coffee"] },
  { code: "0902", label: "Tea", keywords: ["tea"] },
  { code: "0904", label: "Pepper (black, white)", keywords: ["pepper", "black pepper", "peppercorn"] },
  { code: "0906", label: "Cinnamon", keywords: ["cinnamon"] },
  { code: "0908", label: "Nutmeg, mace, cardamom", keywords: ["nutmeg", "mace", "cardamom", "elaichi"] },
  { code: "0910", label: "Ginger, turmeric, spices", keywords: ["ginger", "turmeric", "haldi", "masala", "spice"] },
  { code: "1006", label: "Rice", keywords: ["rice", "basmati"] },
  { code: "1101", label: "Wheat flour, atta", keywords: ["flour", "atta", "wheat"] },
  { code: "1701", label: "Sugar", keywords: ["sugar", "jaggery", "gur"] },
  { code: "1902", label: "Pasta, noodles", keywords: ["pasta", "noodle", "macaroni"] },
  { code: "2009", label: "Fruit juices", keywords: ["juice"] },
  { code: "2101", label: "Coffee/tea extracts, instant coffee", keywords: ["instant coffee", "extract"] },
  { code: "2202", label: "Soft drinks, bottled water", keywords: ["soft drink", "bottled water", "beverage"] },
  { code: "3004", label: "Medicines (packaged)", keywords: ["medicine", "tablet", "capsule", "pharma", "drug"] },
  { code: "3303", label: "Perfumes", keywords: ["perfume", "fragrance", "attar"] },
  { code: "3304", label: "Cosmetics, makeup", keywords: ["cosmetic", "makeup", "lipstick", "foundation cream"] },
  { code: "3305", label: "Hair care products", keywords: ["shampoo", "hair oil", "hair care", "conditioner"] },
  { code: "3401", label: "Soap", keywords: ["soap"] },
  { code: "3402", label: "Detergents, cleaning agents", keywords: ["detergent", "cleaning", "washing powder"] },
  { code: "4202", label: "Bags, wallets, luggage", keywords: ["bag", "wallet", "luggage", "purse", "handbag"] },
  { code: "4820", label: "Notebooks, registers, stationery", keywords: ["notebook", "register", "stationery", "diary"] },
  { code: "4901", label: "Printed books", keywords: ["book", "printed book"] },
  { code: "5208", label: "Cotton fabric", keywords: ["cotton fabric", "cotton cloth"] },
  { code: "6109", label: "T-shirts, vests", keywords: ["t-shirt", "tshirt", "vest"] },
  { code: "6110", label: "Sweaters, pullovers", keywords: ["sweater", "pullover", "cardigan"] },
  { code: "6203", label: "Men's suits, trousers", keywords: ["men's suit", "trouser", "men's shirt", "men's jacket"] },
  { code: "6204", label: "Women's suits, dresses", keywords: ["women's dress", "women's suit", "saree blouse", "kurti"] },
  { code: "6217", label: "Clothing accessories", keywords: ["scarf", "tie", "belt cloth"] },
  { code: "6302", label: "Bed linen, towels", keywords: ["bedsheet", "towel", "bed linen", "pillow cover"] },
  { code: "6403", label: "Leather footwear", keywords: ["leather shoe", "leather footwear", "leather sandal"] },
  { code: "6404", label: "Footwear (textile)", keywords: ["shoe", "footwear", "sandal", "slipper", "sneaker"] },
  { code: "7113", label: "Jewellery (gold, silver, precious stones)", keywords: ["jewellery", "jewelry", "gold", "silver", "diamond", "ring", "necklace", "bangle", "earring"] },
  { code: "7117", label: "Imitation jewellery", keywords: ["imitation jewellery", "artificial jewellery", "fashion jewellery"] },
  { code: "8215", label: "Cutlery, kitchen tools", keywords: ["cutlery", "spoon", "fork", "knife set", "kitchen tool"] },
  { code: "8414", label: "Fans, air coolers", keywords: ["fan", "air cooler", "exhaust fan"] },
  { code: "8415", label: "Air conditioners", keywords: ["air conditioner", "ac unit"] },
  { code: "8418", label: "Refrigerators, freezers", keywords: ["refrigerator", "fridge", "freezer"] },
  { code: "8450", label: "Washing machines", keywords: ["washing machine"] },
  { code: "8471", label: "Computers, laptops", keywords: ["computer", "laptop", "desktop pc"] },
  { code: "8517", label: "Mobile phones, telephones", keywords: ["mobile phone", "smartphone", "telephone"] },
  { code: "8528", label: "Televisions, monitors", keywords: ["television", "tv", "monitor"] },
  { code: "8544", label: "Cables, wires", keywords: ["cable", "wire", "charger cable"] },
  { code: "9401", label: "Chairs, seats", keywords: ["chair", "seat", "sofa", "recliner"] },
  { code: "9403", label: "Furniture (tables, cabinets)", keywords: ["furniture", "table", "cabinet", "wardrobe", "shelf", "bed frame"] },
  { code: "9503", label: "Toys", keywords: ["toy", "action figure", "doll"] },
  { code: "9506", label: "Sports equipment", keywords: ["sports equipment", "cricket bat", "football", "gym equipment"] },
  { code: "9608", label: "Pens, markers", keywords: ["pen", "marker", "ballpoint"] },
  { code: "0801", label: "Cashew, coconut, nuts", keywords: ["cashew", "coconut", "nuts", "almond", "dry fruit"] },
  { code: "1512", label: "Cooking / edible oils", keywords: ["cooking oil", "edible oil", "sunflower oil", "mustard oil", "groundnut oil"] },
  { code: "0402", label: "Milk, dairy powder", keywords: ["milk powder", "dairy"] },
  { code: "0405", label: "Butter, ghee", keywords: ["butter", "ghee"] },
  { code: "0406", label: "Cheese", keywords: ["cheese", "paneer"] },
  { code: "9983", label: "Professional / consulting services", keywords: ["consulting", "professional service", "advisory"] },
  { code: "9985", label: "Support services", keywords: ["support service", "maintenance service"] },
  { code: "9987", label: "Repair & maintenance services", keywords: ["repair service", "maintenance", "servicing"] },
  { code: "9963", label: "Accommodation, travel packages", keywords: ["hotel", "accommodation", "travel package", "tour package"] },
  { code: "9964", label: "Passenger transport services", keywords: ["transport service", "taxi", "cab service"] },
  { code: "9992", label: "Education services", keywords: ["education", "coaching", "tuition", "training course"] },
  { code: "9954", label: "Construction services", keywords: ["construction service", "building work"] },
];

/** Case-insensitive keyword search across HSN entries, ranked by best match. */
export function searchHsnCodes(query: string, limit = 6): HsnEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored = HSN_REFERENCE.map((entry) => {
    let score = 0;
    // Matching the code itself (by prefix) ranks highest — if someone
    // types "7113" or even just "71", they already know the code and want
    // to confirm what it covers, so that's a stronger signal than a
    // keyword guess from the product name.
    if (/^\d+$/.test(q)) {
      if (entry.code === q) score = Math.max(score, 110);
      else if (entry.code.startsWith(q)) score = Math.max(score, 90);
    }
    for (const kw of entry.keywords) {
      if (kw === q) score = Math.max(score, 100);
      else if (kw.startsWith(q)) score = Math.max(score, 80);
      else if (kw.includes(q)) score = Math.max(score, 50);
    }
    if (entry.label.toLowerCase().includes(q)) score = Math.max(score, 40);
    return { entry, score };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}
