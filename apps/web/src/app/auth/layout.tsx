export const metadata = {
  title: 'Authentication | China-RU',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-red-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
