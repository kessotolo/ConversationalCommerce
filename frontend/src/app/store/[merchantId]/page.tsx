export default function StorePage({ params }: { params: { merchantId: string } }) {
    return (
        <div>
            <h1>Store: {params.merchantId}</h1>
        </div>
    );
}
