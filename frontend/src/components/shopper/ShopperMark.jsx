import mark from "@/assets/shopper-concierge-mark.png";

export function ShopperMark({ className = "" }) {
  return (
    <span className={`shopper-mark inline-block ${className}`} aria-hidden="true">
      <img
        src={mark}
        alt=""
        width={512}
        height={512}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
