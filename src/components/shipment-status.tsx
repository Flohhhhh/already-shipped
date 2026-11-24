export function ShipmentStatus({
  shippedIn,
  shippedUrl,
  shippedKind,
  shippedSuppressed,
  pendingShipment,
}: {
  shippedIn: string | null;
  shippedUrl: string | null;
  shippedKind: "auto" | "confirmed" | null;
  shippedSuppressed: boolean;
  pendingShipment: { version: string; url: string; title: string } | null;
}) {
  if (shippedIn && !shippedSuppressed && shippedKind === "auto") {
    return (
      <p className="mt-2 text-sm">
        Shipped (auto-detected)
        {shippedUrl ? (
          <>
            {" "}
            <a
              className="underline"
              href={shippedUrl}
              target="_blank"
              rel="noreferrer"
            >
              {shippedIn}
            </a>
          </>
        ) : (
          ` ${shippedIn}`
        )}
      </p>
    );
  }
  if (shippedIn && !shippedSuppressed) {
    return (
      <p className="mt-2 text-sm">
        Shipped in {shippedIn}
        {shippedUrl ? (
          <>
            {" "}
            <a
              className="underline"
              href={shippedUrl}
              target="_blank"
              rel="noreferrer"
            >
              Release note
            </a>
          </>
        ) : null}
      </p>
    );
  }
  if (pendingShipment) {
    return (
      <p className="mt-2 text-sm">
        Possibly shipped, pending review
        {pendingShipment.url ? (
          <>
            {" "}
            <a
              className="underline"
              href={pendingShipment.url}
              target="_blank"
              rel="noreferrer"
            >
              {pendingShipment.version}
            </a>
          </>
        ) : null}
      </p>
    );
  }
  return null;
}
