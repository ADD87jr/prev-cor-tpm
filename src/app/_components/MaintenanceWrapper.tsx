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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Paths that should be excluded from maintenance mode
  const excludedPaths = ['/admin', '/api', '/maintenance'];
  const isExcluded = pathname ? excludedPaths.some(path => pathname.startsWith(path)) : false;

  useEffect(() => {
    // Check maintenance status from API
    async function checkMaintenance() {
      try {
        // Check both maintenance status and admin session in parallel
        const [maintenanceRes, adminRes] = await Promise.all([
          fetch('/api/maintenance-status', { cache: 'no-store' }),
          fetch('/admin/api/verify-session', { cache: 'no-store', credentials: 'include' })
        ]);
        
        if (maintenanceRes.ok) {
          const data = await maintenanceRes.json();
          setIsMaintenanceMode(data.enabled === true);
        }
        
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setIsAdminAuthenticated(adminData.valid === true);
        }
      } catch {
        // If API fails, continue normally
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

  // Don't show maintenance page for excluded paths or authenticated admins
  if (isExcluded || isAdminAuthenticated) {
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
