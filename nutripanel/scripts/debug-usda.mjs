import "dotenv/config";

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Usage: node scripts/debug-usda.mjs <fdcId> [fdcId...]");
  process.exit(1);
}

const key = process.env.USDA_API_KEY;
if (!key) {
  console.error("Missing USDA_API_KEY");
  process.exit(1);
}

for (const id of ids) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(
    JSON.stringify(
      {
        id,
        description: data.description,
        dataType: data.dataType,
        hasFoodNutrients: Array.isArray(data.foodNutrients),
        foodNutrientsSample: (data.foodNutrients ?? []).slice(0, 12),
        labelNutrients: data.labelNutrients ?? null,
      },
      null,
      2
    )
  );
}
