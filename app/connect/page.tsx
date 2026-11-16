import { ConnectCard } from "@/components/lock/Lock";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string | string[] }>;
}) {
  const { request } = await searchParams;
  return <ConnectCard request={String(request ?? "")} />;
}
