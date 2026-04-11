export function AppFooter() {
  return (
    <footer className="px-4 pb-4 pt-2">
      <div className="container max-w-7xl mx-auto">
        <div className="ios-footer rounded-2xl px-6 py-3 flex items-center justify-center gap-3">
          <img
            src="/gryfon-logo.png"
            alt="Gryfon Technologies"
            style={{ filter: "brightness(0)", opacity: 0.55, height: "22px", objectFit: "contain" }}
          />
          <span
            className="text-[11px] font-medium tracking-wider"
            style={{ color: "rgba(80,60,20,0.45)" }}
          >
            GRYFON TECHNOLOGIES
          </span>
        </div>
      </div>
    </footer>
  );
}
