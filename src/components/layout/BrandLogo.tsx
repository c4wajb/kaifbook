type BrandLogoProps = {
  office?: boolean;
  isStolix?: boolean;
};

export function BrandLogoMark() {
  return <img className="kaifbook-logo-mark" src="/icon.svg" alt="" aria-hidden="true" />;
}

export function BrandLogo({ office = false, isStolix = false }: BrandLogoProps) {
  const label = isStolix ? "Stolix" : office ? "Kaifbook Office" : "Kaifbook";
  return (
    <>
      <BrandLogoMark />
      <span>{label}</span>
    </>
  );
}
