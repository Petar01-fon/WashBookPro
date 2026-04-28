import BookingFlow from "./BookingFlow";

interface Props {
    params: Promise <{ slug: string }>;
}

export default async function BookingPage({ params }: Props) {
    const { slug } = await params;
    return <BookingFlow slug={slug} />;
}