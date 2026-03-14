export default function ShopLoading() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
      <div className="flex gap-4 mb-6">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-10 bg-gray-200 rounded-full w-24"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="bg-white rounded-xl shadow p-4">
            <div className="h-40 bg-gray-200 rounded mb-3"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
