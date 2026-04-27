import React, { useEffect, useRef, useState } from 'react';

const cards = [
    {
        id: 1,
        badge: "Customers",
        title: "Find out why Cathay Pacific chose AWS",
        logo: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-cathay-pacific-logo-1.2707458d57f34b861a3aab0335d75ec4ace74cda.png",
        bg: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-cathay-pacific-bg-image-1.a40dd92378c07fbb98cc536c84425a65e29de245.jpg"
    },
    {
        id: 2,
        badge: "Customers",
        title: "Learn how Snap uses Graviton2-based instances",
        logo: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-snap-logo-1.69a6f4ea1b838363d01404a1ac86012d39fca6e0.png",
        bg: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-snap-bg-image-1.c6c40dc579f0e3324b23a2ac036e6cd91c04f9af.jpg"
    },
    {
        id: 3,
        badge: "Customers",
        title: "Explore how Volkswagen innovates using Amazon EC2",
        logo: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-volks-logo-1.8ecb03f9da19c8b2dff12caf857c1424f79fdac6.png",
        bg: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/ec2-customers-volks-bg-image-1.11140c0785120110aff0553e9e101e1465613c10.jpg"
    }
];

const ScrollingStack = () => {
    const containerRef = useRef(null);
    const [cardOffsets, setCardOffsets] = useState([]);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const containerTop = container.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            // Start revealing when container enters viewport
            const scrollStart = windowHeight - containerTop;

            const newOffsets = cards.map((_, index) => {
                if (index === 0) return 0; // First card always at base position

                // Calculate how much this card should be offset
                const baseOffset = 80 + index * 40;
                const revealPoint = index * windowHeight * 0.5; // Each card reveals after scrolling 50vh
                const progress = Math.max(0, Math.min(1, (scrollStart - revealPoint) / (windowHeight * 0.5)));

                // Interpolate from stacked position to final position
                const stackedOffset = 80 + 40; // All cards start stacked close together
                const finalOffset = baseOffset;

                return stackedOffset + (finalOffset - stackedOffset) * progress;
            });

            setCardOffsets(newOffsets);
        };

        handleScroll(); // Initial calculation
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section className="bg-gray-100 py-20 px-4" ref={containerRef}>
            <div className="max-w-5xl mx-auto">
                <h2 className="text-4xl font-bold mb-12 text-gray-900">Customers</h2>

                <div className="flex flex-col gap-10">
                    {cards.map((card, index) => {
                        const topOffset = cardOffsets[index] ?? (80 + index * 40);

                        return (
                            <div
                                key={card.id}
                                className="sticky transition-all duration-300 ease-out"
                                style={{
                                    top: `${topOffset}px`,
                                    zIndex: cards.length - index
                                }}
                            >
                                <div className="relative h-[450px] w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
                                    {/* Background Image */}
                                    <img
                                        src={card.bg}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover opacity-60"
                                    />

                                    {/* Content Overlay */}
                                    <div className="relative h-full p-8 md:p-12 flex flex-col justify-between text-white">
                                        <div>
                                            <span className="inline-block px-3 py-1 text-sm font-semibold bg-white/20 backdrop-blur-md rounded-md mb-6">
                                                {card.badge}
                                            </span>
                                            <div className="max-w-md">
                                                <img src={card.logo} alt="Logo" className="h-12 mb-6 object-contain" />
                                                <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                                                    {card.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 font-semibold hover:gap-4 transition-all cursor-pointer">
                                            <span>Learn more</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Spacer to allow the last card to pin and scroll past */}
                <div className="h-screen" />
            </div>
        </section>
    );
};

export default ScrollingStack;