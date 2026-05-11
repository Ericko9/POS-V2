import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/shared/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name} userRole={session.user.role} />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
