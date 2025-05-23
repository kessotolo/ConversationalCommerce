export default function StorePage({ params }: { params: { merchantId: string } }) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-2xl font-bold">Store: {params.merchantId}</h1>
        </div>
    );
}