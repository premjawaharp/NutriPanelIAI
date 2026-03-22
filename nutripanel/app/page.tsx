export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-xl px-6">
        <h1 className="text-5xl font-bold text-gray-900">
          NutriPanel
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Generate Canadian nutrition labels from recipes in minutes.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <button className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800">
            Get Started
          </button>

          <button className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-100">
            View Pricing
          </button>
        </div>
      </div>
    </main>
  );
}