import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    name?: string;
    service?: string;
    startsAt?: string;
    email?: string;
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { name, service, startsAt, email } = await searchParams;

  const date = startsAt
    ? new Date(startsAt).toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const time = startsAt
    ? new Date(startsAt).toLocaleTimeString("sr-RS", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-6 space-y-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-gray-800">Rezervacija primljena!</h1>
        <p className="text-gray-600">
          Hvala, <strong>{name}</strong>! Vaša rezervacija čeka potvrdu.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Usluga</span>
            <span className="font-medium">{service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Datum</span>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vreme</span>
            <span className="font-medium">{time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Potvrda na</span>
            <span className="font-medium">{email}</span>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Poslali smo potvrdu na vašu email adresu.
        </p>

        <Link
          href={`/book/${slug}`}
          className="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
        >
          Nova rezervacija
        </Link>
      </div>
    </div>
  );
}