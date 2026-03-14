export default function AdminLoading() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-56 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-12 bg-gray-200 rounded w-full mb-2"></div>
        ))}
      </div>
    </div>
  );
}
