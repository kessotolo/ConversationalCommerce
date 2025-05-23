import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Product Details',
    description: 'View product details and specifications',
};

export default function ProductPage({ params }: { params: { slug: string } }) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-2xl font-bold">Product: {params.slug}</h1>
        </div>
    );
}