export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "var(--color-sidebar-bg)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg"
              style={{ background: "var(--color-primary)" }}
            >
              P
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">
              pdfy
            </span>
          </div>
        </div>
        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Your complete PDF
            <br />
            workspace.
          </h1>
          <p style={{ color: "var(--color-sidebar-text)" }} className="text-lg">
            Edit, convert, sign, and collaborate on PDFs from anywhere. Secure,
            fast, and designed for teams.
          </p>
        </div>
        <p
          className="text-sm"
          style={{ color: "var(--color-sidebar-text)" }}
        >
          Secure document management platform
        </p>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
