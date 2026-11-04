type PageHeaderProps = {
  label?: string;
  title: string;
  subtitle?: string;
  isRtl?: boolean;
};

/** Inner-page hero — v2 kicker + display title + lede. */
export function PageHeader({ label, title, subtitle, isRtl = false }: PageHeaderProps) {
  return (
    <header className="pt-12 pb-6 md:pt-20 md:pb-10" dir={isRtl ? "rtl" : "ltr"}>
      <div className="wrap">
        {label && <p className="kicker">{label}</p>}
        <h1 className="v2-h1 text-text">{title}</h1>
        {subtitle && <p className="lede mt-5">{subtitle}</p>}
      </div>
    </header>
  );
}
