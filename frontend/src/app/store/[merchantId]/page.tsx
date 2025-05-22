interface StorePageProps {
    params: {
        merchantId: string;
    };
}

export default function StorePage({ params }: StorePageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-2xl font-bold">Store: {params.merchantId}</h1>
        </div>
    );
}