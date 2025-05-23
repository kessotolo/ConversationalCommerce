interface ProductPageProps {
    params: {
        slug: string;
    };
    searchParams: { [key: string]: string | string[] | undefined };
}

export default function ProductPage({ params }: ProductPageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-2xl font-bold">Product: {params.slug}</h1>
        </div>
    );
}