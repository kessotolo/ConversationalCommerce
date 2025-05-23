export default function StorePage({ params }: { params: any }) {
    return (
        <div>
            <h1>Store: {params.merchantId}</h1>
        </div>
    );
}
