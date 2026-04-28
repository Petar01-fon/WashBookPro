import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import TerminalView from "./TerminalView";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TerminalPage({ params }: Props) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const authed = cookieStore.get("washbook_authed");

  if (!authed) {
    redirect(`/login?from=/terminal/${slug}`);
  }

  return <TerminalView slug={slug} />;
}