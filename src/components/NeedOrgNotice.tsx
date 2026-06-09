import Link from "next/link";

export function NeedOrgNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
      Bitte zuerst dein{" "}
      <Link href="/einstellungen" className="font-medium underline">
        Unternehmen einrichten
      </Link>
      , bevor du Kunden oder Rechnungen anlegst.
    </div>
  );
}
