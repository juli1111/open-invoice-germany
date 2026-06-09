"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { finalizeInvoice, FinalizeError } from "@/domain/invoice/finalize";
import { cancelInvoice, CancelError } from "@/domain/invoice/cancel";

export async function finalizeAction(formData: FormData) {
  const id = String(formData.get("id"));
  let errorMessage = "";
  try {
    await finalizeInvoice(id);
  } catch (e) {
    errorMessage = e instanceof FinalizeError ? e.message : "Festschreiben fehlgeschlagen.";
  }
  if (errorMessage) {
    redirect(`/rechnungen/${id}?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/rechnungen");
  redirect(`/rechnungen/${id}`);
}

export async function cancelAction(formData: FormData) {
  const id = String(formData.get("id"));
  let errorMessage = "";
  let creditId = "";
  try {
    const res = await cancelInvoice(id);
    creditId = res.creditNote.id;
  } catch (e) {
    errorMessage = e instanceof CancelError ? e.message : "Storno fehlgeschlagen.";
  }
  if (errorMessage) {
    redirect(`/rechnungen/${id}?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath("/rechnungen");
  redirect(`/rechnungen/${creditId}`);
}
