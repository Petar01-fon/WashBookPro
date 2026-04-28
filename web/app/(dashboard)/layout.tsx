// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { getAccessToken, decodeToken, logout } from "@/lib/auth";

// type UserInfo = {
//   role: string;
//   tenantId: string;
// };

// export default function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const router = useRouter();
//   const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

//   useEffect(() => {
//     const token = getAccessToken();
//     if (!token) {
//       router.push("/login");
//       return;
//     }

//     const payload = decodeToken(token);
//     if (!payload) {
//       router.push("/login");
//       return;
//     }

//     setUserInfo({ role: payload.role, tenantId: payload.tenant_id });
//   }, [router]);

//   function handleLogout() {
//     logout();
//     router.push("/login");
//   }

//   if (!userInfo) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <p className="text-sm text-gray-400">Učitavanje...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <header className="border-b border-gray-200 bg-white px-6 py-3">
//         <div className="flex items-center justify-between">
//           <span className="font-semibold text-gray-900">WashBookPro</span>
//           <div className="flex items-center gap-4">
//             <span className="text-sm text-gray-500">{userInfo.role}</span>
//             <button
//               onClick={handleLogout}
//               className="text-sm text-gray-500 hover:text-gray-900"
//             >
//               Odjavi se
//             </button>
//           </div>
//         </div>
//       </header>
//       <main className="p-6">{children}</main>
//     </div>
//   );
// }


import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

