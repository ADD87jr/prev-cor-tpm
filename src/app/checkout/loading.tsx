export default function CheckoutLoading() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-16 w-16 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
        <div className="h-12 bg-gray-200 rounded w-full mt-6"></div>
      </div>
    </div>
  );
}
