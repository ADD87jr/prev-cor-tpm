'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const pathname = usePathname();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Paths that should be excluded from maintenance mode
  const excludedPaths = ['/admin', '/api', '/maintenance'];
  const isExcluded = pathname ? excludedPaths.some(path => pathname.startsWith(path)) : false;

  useEffect(() => {
    // Check maintenance status from public JSON file
    async function checkMaintenance() {
      try {
        const res = await fetch('/maintenance-status.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIsMaintenanceMode(data.enabled === true);
        }
      } catch {
        // If file doesn't exist or can't be read, continue normally
      } finally {
        setIsLoading(false);
      }
    }

    if (!isExcluded) {
      checkMaintenance();
    } else {
      setIsLoading(false);
    }
  }, [pathname, isExcluded]);

  // Don't show maintenance page for excluded paths
  if (isExcluded) {
    return <>{children}</>;
  }

  // Show nothing while checking (brief flash prevention)
  if (isLoading) {
    return null;
  }

  // Show maintenance page if enabled
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Site în mentenanță
          </h1>
          <p className="text-gray-600 mb-6">
            Lucrăm la îmbunătățirea site-ului. Vă rugăm să reveniți în curând!
          </p>
          <p className="text-sm text-gray-500">
            Pentru urgențe, contactați-ne la: office@prevcortpm.ro
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
