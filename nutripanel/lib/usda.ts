export async function searchUsdaFoods(query: string) {
    const apiKey = process.env.USDA_API_KEY;
  
    if (!apiKey) {
      throw new Error("Missing USDA_API_KEY");
    }
  
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          pageSize: 10,
          dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        }),
        cache: "no-store",
      }
    );
  
    if (!response.ok) {
      throw new Error(`USDA search failed with status ${response.status}`);
    }
  
    return response.json();
  }