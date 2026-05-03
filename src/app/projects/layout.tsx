import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[240px] relative w-full h-full overflow-hidden bg-background">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
